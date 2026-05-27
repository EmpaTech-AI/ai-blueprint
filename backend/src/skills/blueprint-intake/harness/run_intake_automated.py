#!/usr/bin/env python3
"""
Blueprint Intake — Automation Wrapper (WR-01 through WR-04)
============================================================

Drives the blueprint-intake skill via the Anthropic API using the mandatory
3-chunk workflow defined in SKILL.md. Produces a validated Compressed Client
Dossier, structured JSON logs, and a cost/metrics pipeline_result.json.

Usage:
    python run_intake_automated.py materials.json
    python run_intake_automated.py materials.json --output-dir ./outputs
    python run_intake_automated.py materials.json --model claude-opus-4-7
    python run_intake_automated.py materials.json --engagement-ref BP-2026-001
    python run_intake_automated.py materials.json --json      # structured JSON log to stdout
    python run_intake_automated.py materials.json --skip-gate # not recommended
    python run_intake_automated.py materials.json --dry-run   # build prompt only, no API call

Requirements:
    pip install anthropic>=0.28.0
    export ANTHROPIC_API_KEY=<your-key>

Exit codes:
    0 — Success: dossier produced and GATE 1 PASS
    1 — Gate FAIL: dossier produced but validation failed; do not proceed to Step 2
    2 — Error: invalid input, API unreachable, harness crash, or fatal exception

Output artifacts (see docs/ARTIFACT_LIFECYCLE_POLICY.md for retention policy):
    <output_dir>/<engagement_ref>/dossier_<engagement_ref>.md
    <output_dir>/<engagement_ref>/pipeline_result_<engagement_ref>.json
    <output_dir>/<engagement_ref>/chunks/chunk_1.md
    <output_dir>/<engagement_ref>/chunks/chunk_2.md
    <output_dir>/<engagement_ref>/chunks/chunk_3.md
    <output_dir>/logs/<engagement_ref>_<timestamp>.jsonl

Concurrency safety (WR-04):
    This wrapper is stateless. Each invocation writes to a unique output directory
    keyed by engagement_ref. Concurrent runs with different engagement references
    are safe. Concurrent runs with the SAME engagement_ref will overwrite each
    other's output — serialize by engagement_ref at the caller level.
"""

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# anthropic is imported lazily inside call_api() so that --help and --dry-run
# work without the SDK installed (required for CI import checks — QA-01).
try:
    import anthropic as _anthropic_module  # noqa: F401 — pre-warm check; removed below
    del _anthropic_module
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

# ============================================================================
# Model configuration
# See RUNBOOK_MODEL_DEPRECATION.md for the upgrade procedure when the model
# is deprecated or a newer model supersedes it.
# ============================================================================

DEFAULT_MODEL = "claude-opus-4-7"

# Pricing per million tokens (USD) — update when Anthropic pricing changes.
# Verified: 2026-05-27. See RUNBOOK_MODEL_DEPRECATION.md §Pricing Update.
MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-7": {
        "input_per_mtok": 15.00,
        "output_per_mtok": 75.00,
        "cache_write_per_mtok": 18.75,
        "cache_read_per_mtok": 1.50,
    },
    "claude-sonnet-4-6": {
        "input_per_mtok": 3.00,
        "output_per_mtok": 15.00,
        "cache_write_per_mtok": 3.75,
        "cache_read_per_mtok": 0.30,
    },
    "claude-haiku-4-5-20251001": {
        "input_per_mtok": 0.80,
        "output_per_mtok": 4.00,
        "cache_write_per_mtok": 1.00,
        "cache_read_per_mtok": 0.08,
    },
}

# ============================================================================
# Retry configuration (WR-04: rate-limit handling)
# ============================================================================

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 5.0
MAX_BACKOFF_SECONDS = 60.0

# ============================================================================
# 3-chunk workflow constants
# ============================================================================

CHUNK_2_TRIGGER = "continue to chunk 2"
CHUNK_3_TRIGGER = "continue to chunk 3"

# Expected word count ranges per chunk (from SKILL.md)
CHUNK_WORD_TARGETS = {1: (1200, 1800), 2: (1800, 2600), 3: (600, 1100)}

CHECKPOINT_STRIP_RE = re.compile(
    r"\n?---\n\n## CHECKPOINT [12] —.*?(?=\n## [A-Z\[]|\Z)",
    re.DOTALL,
)

# ============================================================================
# Data model (WR-02: structured logging; WR-03: cost tracking)
# ============================================================================

@dataclass
class TokenUsage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_write_tokens: int = 0
    cache_read_tokens: int = 0

    def add(self, other: "TokenUsage") -> None:
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.cache_write_tokens += other.cache_write_tokens
        self.cache_read_tokens += other.cache_read_tokens

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class ChunkRecord:
    chunk_number: int
    duration_seconds: float
    word_count: int
    usage: TokenUsage
    retry_count: int = 0
    within_expected_range: bool = True


@dataclass
class PipelineResult:
    engagement_ref: str
    client_name: str
    model: str
    schema_version: str = "intake_v1.0"
    skill_version: str = "2.1.0"
    started_at: str = ""
    completed_at: str = ""
    gate_result: str = "NOT_RUN"
    gate_fail_count: int = 0
    gate_output: str = ""
    dossier_path: str = ""
    chunks: list = field(default_factory=list)
    total_usage: TokenUsage = field(default_factory=TokenUsage)
    cost_breakdown_usd: dict = field(default_factory=dict)
    total_cost_usd: float = 0.0
    error: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["total_usage"] = asdict(self.total_usage)
        d["chunks"] = [
            {**asdict(c), "usage": asdict(c.usage)}
            for c in self.chunks
        ]
        return d


# ============================================================================
# Structured JSON logging (WR-02)
# ============================================================================

class _JsonFormatter(logging.Formatter):
    def __init__(self, engagement_ref: str) -> None:
        super().__init__()
        self._ref = engagement_ref

    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "engagement_ref": self._ref,
            "event": record.getMessage(),
        }
        if hasattr(record, "extra"):
            entry.update(record.extra)
        return json.dumps(entry, ensure_ascii=False)


def setup_logging(
    json_mode: bool,
    engagement_ref: str,
    log_path: Optional[Path] = None,
) -> logging.Logger:
    logger = logging.getLogger(f"blueprint_intake.{engagement_ref}")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    logger.propagate = False

    json_fmt = _JsonFormatter(engagement_ref)
    plain_fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    stdout_handler = logging.StreamHandler(sys.stdout if json_mode else sys.stderr)
    stdout_handler.setFormatter(json_fmt if json_mode else plain_fmt)
    logger.addHandler(stdout_handler)

    if log_path:
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setFormatter(json_fmt)
        logger.addHandler(file_handler)

    return logger


def log_event(logger: logging.Logger, event: str, **extra) -> None:
    record = logging.LogRecord(
        name=logger.name,
        level=logging.INFO,
        pathname=__file__,
        lineno=0,
        msg=event,
        args=(),
        exc_info=None,
    )
    record.extra = extra
    logger.handle(record)


# ============================================================================
# Cost calculation (WR-03)
# ============================================================================

def calculate_cost(usage: TokenUsage, model: str) -> tuple[dict, float]:
    pricing = MODEL_PRICING.get(model, MODEL_PRICING[DEFAULT_MODEL])
    breakdown = {
        "input_usd": round((usage.input_tokens / 1_000_000) * pricing["input_per_mtok"], 6),
        "output_usd": round((usage.output_tokens / 1_000_000) * pricing["output_per_mtok"], 6),
        "cache_write_usd": round((usage.cache_write_tokens / 1_000_000) * pricing["cache_write_per_mtok"], 6),
        "cache_read_usd": round((usage.cache_read_tokens / 1_000_000) * pricing["cache_read_per_mtok"], 6),
    }
    total = sum(breakdown.values())
    breakdown["total_usd"] = round(total, 6)
    return breakdown, round(total, 6)


# ============================================================================
# Materials loading (WF-02: see docs/MATERIALS_JSON_CONTRACT.md for schema)
# ============================================================================

REQUIRED_MATERIAL_FIELDS = ["engagement_ref", "client_name", "industry", "intake_form"]

def load_materials(materials_path: Path) -> dict:
    with open(materials_path, encoding="utf-8") as f:
        materials = json.load(f)
    missing = [f for f in REQUIRED_MATERIAL_FIELDS if f not in materials]
    if missing:
        raise ValueError(
            f"materials.json is missing required fields: {missing}. "
            "See docs/MATERIALS_JSON_CONTRACT.md for the full schema."
        )
    return materials


def build_document_context(materials: dict, base_dir: Path) -> str:
    docs = materials.get("documents", [])
    if not docs:
        return "No supplementary documents uploaded for this engagement."

    lines = ["## Uploaded Documents\n"]
    for doc in docs:
        raw_path = doc.get("path", "")
        doc_path = base_dir / raw_path if raw_path else None
        doc_type = doc.get("type", "unknown")
        doc_name = doc.get("name", Path(raw_path).name if raw_path else "unnamed")
        notes = doc.get("notes", "")

        if doc_path and doc_path.exists():
            status = "Available"
            # Real deployment: extract text via pdfplumber or similar and embed it here.
            # For now, signal presence only; the skill treats listed docs as readable.
            content_note = f"(file present at {doc_path})"
        else:
            status = "NOT FOUND — treat as missing"
            content_note = f"(expected at {doc_path or 'path not specified'})"

        line = f"- **{doc_name}** | type: `{doc_type}` | status: {status} {content_note}"
        if notes:
            line += f" | note: {notes}"
        lines.append(line)

    return "\n".join(lines)


def build_initial_user_message(materials: dict, doc_context: str) -> str:
    engagement_ref = materials["engagement_ref"]
    client_name = materials["client_name"]
    industry = materials["industry"]
    form = materials.get("intake_form", {})
    notes = materials.get("engagement_notes", "")

    parts = [
        "## Blueprint Intake Request",
        "",
        f"**Engagement Reference:** {engagement_ref}",
        f"**Client Name:** {client_name}",
        f"**Industry:** {industry}",
    ]
    if notes:
        parts += ["", f"**Engagement Notes:** {notes}"]

    parts += [
        "",
        "## Intake Form Responses",
        "",
        json.dumps(form, indent=2, ensure_ascii=False),
        "",
        doc_context,
        "",
        (
            "Please begin the 3-chunk workflow now. "
            "Produce Chunk 1: Header block, Document Receipt table, Section A (Executive Summary), "
            "Section B (Key Data Points table). End with Checkpoint 1. "
            "Do NOT begin Section C."
        ),
    ]
    return "\n".join(parts)


# ============================================================================
# Skill system prompt loader
# ============================================================================

def load_system_prompt(skill_root: Path) -> str:
    skill_md = skill_root / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found at {skill_md}")

    parts = [skill_md.read_text(encoding="utf-8")]

    # Reference files loaded in the order specified by SKILL.md §Methodology Reference
    ref_files = [
        skill_root / "references" / "intake_v1.0.md",
        skill_root / "references" / "citation_rules.md",
        skill_root / "references" / "confidence_thresholds.md",
        skill_root / "references" / "algorithms" / "hypothesis_selection.md",
        skill_root / "references" / "algorithms" / "pain_point_selection.md",
        skill_root / "references" / "algorithms" / "ordering.md",
        skill_root / "references" / "preflight.md",
        skill_root / "references" / "source_registry.md",
        skill_root / "archetypes" / "recruitment.md",
        skill_root / "examples" / "recruitment_meridian_v1.md",
    ]

    for ref in ref_files:
        if ref.exists():
            parts.append(f"\n\n---\n# Reference: {ref.name}\n\n{ref.read_text(encoding='utf-8')}")

    return "\n".join(parts)


# ============================================================================
# Anthropic API call with retry (WR-04: rate-limit and transient error handling)
# ============================================================================

def call_api(
    client: "anthropic.Anthropic",
    model: str,
    system: str,
    messages: list,
    max_tokens: int,
    logger: logging.Logger,
) -> tuple[str, TokenUsage, int]:
    """
    Call the Anthropic Messages API with exponential backoff.
    Returns (response_text, token_usage, retry_count).
    """
    retry_count = 0

    import anthropic  # lazy — safe to re-import; Python caches module

    while True:
        try:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            text = "".join(
                block.text
                for block in response.content
                if hasattr(block, "text")
            )
            usage = TokenUsage(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                cache_write_tokens=getattr(response.usage, "cache_creation_input_tokens", 0) or 0,
                cache_read_tokens=getattr(response.usage, "cache_read_input_tokens", 0) or 0,
            )
            return text, usage, retry_count

        except anthropic.RateLimitError as exc:
            retry_count += 1
            if retry_count > MAX_RETRIES:
                raise RuntimeError(
                    f"Rate limit exceeded after {MAX_RETRIES} retries. "
                    "Consider spacing engagements further apart or requesting a higher rate limit."
                ) from exc
            wait = min(BASE_BACKOFF_SECONDS * (2 ** (retry_count - 1)), MAX_BACKOFF_SECONDS)
            log_event(logger, "rate_limit_retry", retry=retry_count, wait_seconds=wait)
            time.sleep(wait)

        except anthropic.APIStatusError as exc:
            if exc.status_code in (500, 529) and retry_count < MAX_RETRIES:
                retry_count += 1
                wait = min(BASE_BACKOFF_SECONDS * (2 ** (retry_count - 1)), MAX_BACKOFF_SECONDS)
                log_event(logger, "api_transient_error", status=exc.status_code, retry=retry_count, wait_seconds=wait)
                time.sleep(wait)
            else:
                raise


# ============================================================================
# Chunk validation helpers
# ============================================================================

def check_chunk_completeness(chunk_num: int, text: str, logger: logging.Logger) -> None:
    """Warn if a chunk is missing its expected terminator."""
    terminators = {
        1: "CHECKPOINT 1",
        2: "CHECKPOINT 2",
        3: "Chunks 1–3 complete",
    }
    expected = terminators.get(chunk_num, "")
    if expected and expected not in text:
        log_event(logger, "chunk_missing_terminator", chunk=chunk_num, expected=expected)


def strip_checkpoint_blocks(text: str) -> str:
    """Remove CHECKPOINT 1 and CHECKPOINT 2 blocks from the assembled dossier."""
    return CHECKPOINT_STRIP_RE.sub("", text).strip()


# ============================================================================
# Main pipeline (WR-01: end-to-end live test entry point)
# ============================================================================

def run(
    materials_path: Path,
    output_dir: Path,
    model: str,
    engagement_ref_override: Optional[str],
    skip_gate: bool,
    json_mode: bool,
    dry_run: bool,
) -> int:
    materials = load_materials(materials_path)
    engagement_ref = engagement_ref_override or materials["engagement_ref"]
    client_name = materials["client_name"]

    # Per-engagement output directory (WR-04: unique path per run → no shared state)
    eng_dir = output_dir / engagement_ref
    chunks_dir = eng_dir / "chunks"
    logs_dir = output_dir / "logs"
    for d in (eng_dir, chunks_dir, logs_dir):
        d.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = logs_dir / f"{engagement_ref}_{timestamp}.jsonl"
    logger = setup_logging(json_mode, engagement_ref, log_path)

    result = PipelineResult(
        engagement_ref=engagement_ref,
        client_name=client_name,
        model=model,
        started_at=datetime.now(timezone.utc).isoformat(),
    )

    log_event(logger, "wrapper_start", engagement_ref=engagement_ref, model=model, dry_run=dry_run)

    try:
        skill_root = Path(__file__).parent.parent  # harness/ → blueprint-intake/
        system_prompt = load_system_prompt(skill_root)
        doc_context = build_document_context(materials, materials_path.parent)
        initial_message = build_initial_user_message(materials, doc_context)

        log_event(
            logger, "prompt_built",
            system_chars=len(system_prompt),
            initial_message_chars=len(initial_message),
        )

        if dry_run:
            print(
                f"[DRY RUN] System prompt: {len(system_prompt):,} chars | "
                f"Initial message: {len(initial_message):,} chars"
            )
            return 0

            import anthropic  # lazy — only needed for live runs; allows --help/--dry-run without SDK
        api_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        # ── 3-chunk workflow ─────────────────────────────────────────────────
        messages: list[dict] = [{"role": "user", "content": initial_message}]
        chunk_texts: list[str] = []

        chunk_specs = [
            (1, None, 4096),
            (2, CHUNK_2_TRIGGER, 4096),
            (3, CHUNK_3_TRIGGER, 2048),
        ]

        for chunk_num, trigger, max_tokens in chunk_specs:
            if trigger:
                messages.append({"role": "user", "content": trigger})

            t0 = time.monotonic()
            log_event(logger, "chunk_start", chunk=chunk_num)

            text, usage, retries = call_api(
                api_client, model, system_prompt, messages, max_tokens, logger
            )

            duration = round(time.monotonic() - t0, 2)
            word_count = len(text.split())
            lo, hi = CHUNK_WORD_TARGETS.get(chunk_num, (0, 99999))
            in_range = lo <= word_count <= hi

            log_event(
                logger, "chunk_complete",
                chunk=chunk_num,
                duration_seconds=duration,
                word_count=word_count,
                within_expected_range=in_range,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                cache_write_tokens=usage.cache_write_tokens,
                cache_read_tokens=usage.cache_read_tokens,
                retry_count=retries,
            )

            check_chunk_completeness(chunk_num, text, logger)

            result.chunks.append(ChunkRecord(
                chunk_number=chunk_num,
                duration_seconds=duration,
                word_count=word_count,
                usage=usage,
                retry_count=retries,
                within_expected_range=in_range,
            ))
            result.total_usage.add(usage)

            chunk_path = chunks_dir / f"chunk_{chunk_num}.md"
            chunk_path.write_text(text, encoding="utf-8")

            chunk_texts.append(text)
            messages.append({"role": "assistant", "content": text})

        # ── Assemble dossier ─────────────────────────────────────────────────
        assembled = "\n\n".join(chunk_texts)
        assembled = strip_checkpoint_blocks(assembled)

        dossier_path = eng_dir / f"dossier_{engagement_ref}.md"
        dossier_path.write_text(assembled, encoding="utf-8")
        result.dossier_path = str(dossier_path)

        log_event(
            logger, "dossier_assembled",
            path=str(dossier_path),
            word_count=len(assembled.split()),
        )

        # ── Gate (HR-01: mandatory before blueprint-maturity) ────────────────
        if skip_gate:
            result.gate_result = "SKIPPED"
            log_event(logger, "gate_skipped", warning="Gate skipped — do not invoke blueprint-maturity without manual validation")
        else:
            gate_sh = Path(__file__).parent / "gate.sh"
            gate_proc = subprocess.run(
                ["bash", str(gate_sh), str(dossier_path)],
                capture_output=True,
                text=True,
            )
            gate_output = (gate_proc.stdout + gate_proc.stderr).strip()
            result.gate_result = "PASS" if gate_proc.returncode == 0 else "FAIL"
            result.gate_output = gate_output
            result.gate_fail_count = gate_output.count("FAIL:") if gate_proc.returncode != 0 else 0

            log_event(
                logger, "gate_complete",
                gate_result=result.gate_result,
                fail_count=result.gate_fail_count,
                output=gate_output,
            )

            if not json_mode:
                print(gate_output)

        # ── Cost (WR-03) ─────────────────────────────────────────────────────
        result.cost_breakdown_usd, result.total_cost_usd = calculate_cost(result.total_usage, model)
        result.completed_at = datetime.now(timezone.utc).isoformat()

        log_event(
            logger, "cost_summary",
            total_cost_usd=result.total_cost_usd,
            input_tokens=result.total_usage.input_tokens,
            output_tokens=result.total_usage.output_tokens,
            cache_write_tokens=result.total_usage.cache_write_tokens,
            cache_read_tokens=result.total_usage.cache_read_tokens,
        )

        # ── Write pipeline_result.json ───────────────────────────────────────
        result_path = eng_dir / f"pipeline_result_{engagement_ref}.json"
        result_path.write_text(
            json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        log_event(logger, "result_written", path=str(result_path))

        if not json_mode:
            total_chunks_duration = sum(c.duration_seconds for c in result.chunks)
            print(f"\nEngagement:  {engagement_ref}")
            print(f"Gate:        {result.gate_result}")
            print(f"Dossier:     {dossier_path}")
            print(f"Cost:        ${result.total_cost_usd:.4f} USD ({result.total_usage.total_tokens:,} tokens)")
            print(f"Duration:    {total_chunks_duration:.1f}s (API time only)")
            print(f"Log:         {log_path}")

        return 0 if result.gate_result in ("PASS", "SKIPPED") else 1

    except Exception as exc:
        result.error = str(exc)
        result.completed_at = datetime.now(timezone.utc).isoformat()
        log_event(logger, "wrapper_error", error=str(exc), error_type=type(exc).__name__)

        if not json_mode:
            print(f"\nERROR: {exc}", file=sys.stderr)

        try:
            result_path = eng_dir / f"pipeline_result_{engagement_ref}.json"
            result_path.write_text(
                json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception:
            pass

        return 2


# ============================================================================
# Entry point
# ============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Blueprint Intake — Automation Wrapper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("materials", type=Path, help="Path to materials.json")
    parser.add_argument(
        "--output-dir", type=Path, default=Path("outputs"),
        help="Root output directory (default: ./outputs)",
    )
    parser.add_argument(
        "--model", default=DEFAULT_MODEL,
        help=f"Anthropic model ID (default: {DEFAULT_MODEL}). See RUNBOOK_MODEL_DEPRECATION.md.",
    )
    parser.add_argument(
        "--engagement-ref",
        help="Override the engagement_ref from materials.json",
    )
    parser.add_argument(
        "--skip-gate", action="store_true",
        help="Skip validation gate — dossier saved but NOT safe for blueprint-maturity",
    )
    parser.add_argument(
        "--json", action="store_true", dest="json_mode",
        help="Emit structured JSON log to stdout (human log goes to file only)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Build prompts and validate materials, but do not call the API",
    )
    args = parser.parse_args()

    if not args.materials.exists():
        print(f"ERROR: materials file not found: {args.materials}", file=sys.stderr)
        sys.exit(2)

    if not args.dry_run:
        if not _ANTHROPIC_AVAILABLE:
            print("ERROR: anthropic package not installed. Run: pip install anthropic>=0.28.0", file=sys.stderr)
            sys.exit(2)
        if "ANTHROPIC_API_KEY" not in os.environ:
            print("ERROR: ANTHROPIC_API_KEY environment variable not set.", file=sys.stderr)
            print("       Export it before running: export ANTHROPIC_API_KEY=sk-...", file=sys.stderr)
            sys.exit(2)

    sys.exit(run(
        materials_path=args.materials,
        output_dir=args.output_dir,
        model=args.model,
        engagement_ref_override=args.engagement_ref,
        skip_gate=args.skip_gate,
        json_mode=args.json_mode,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()
