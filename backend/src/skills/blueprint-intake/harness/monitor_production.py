#!/usr/bin/env python3
"""
Production Monitoring — Metrics Aggregator (QA-04)
===================================================

Reads all pipeline_result_*.json files in the outputs directory and computes
the production health metrics defined in the Technical Implementation Guide:

  - Gate PASS rate (target: > 95%)
  - Wrapper duration p50 / p95 / p99
  - Cost per engagement (mean, p95, total)
  - Chunk retry rate
  - API error rate
  - Cross-run hypothesis consistency (requires cross-run pairs — see §Notes)

Output: JSON to stdout (pipe to jq, Grafana push, Datadog metrics, etc.)
        Human-readable table to stderr

Usage:
    python monitor_production.py                          # scan ./outputs/
    python monitor_production.py --outputs-dir /path     # custom outputs dir
    python monitor_production.py --json                  # JSON only (no human table)
    python monitor_production.py --since 2026-05-01      # filter by start date
    python monitor_production.py --archetype recruitment  # filter by archetype (future)

Exit codes:
    0 — OK (metrics computed, no alerts triggered)
    1 — Alert threshold breached (gate PASS rate < 95% or error rate > 5%)
    2 — No data found or input error
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# ── Alert thresholds ─────────────────────────────────────────────────────────

GATE_PASS_RATE_ALERT = 0.95   # alert if < 95%
API_ERROR_RATE_ALERT = 0.05   # alert if > 5%

# ── Helpers ──────────────────────────────────────────────────────────────────

def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * p / 100)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


def parse_iso(ts: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


# ── Data loading ─────────────────────────────────────────────────────────────

def load_results(outputs_dir: Path, since: Optional[datetime] = None) -> list[dict]:
    results = []
    for result_file in outputs_dir.rglob("pipeline_result_*.json"):
        try:
            data = json.loads(result_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        if since:
            started = parse_iso(data.get("started_at", ""))
            if started and started < since:
                continue

        results.append(data)

    return results


# ── Metric computation ───────────────────────────────────────────────────────

def compute_metrics(results: list[dict]) -> dict:
    if not results:
        return {"engagement_count": 0}

    total = len(results)
    gate_results = [r.get("gate_result", "UNKNOWN") for r in results]
    pass_count = gate_results.count("PASS")
    fail_count = gate_results.count("FAIL")
    skip_count = gate_results.count("SKIPPED")
    error_count = sum(1 for r in results if r.get("error"))

    gate_pass_rate = pass_count / total if total > 0 else 0.0

    # Duration metrics (sum of chunk durations per engagement)
    durations = []
    for r in results:
        chunks = r.get("chunks", [])
        total_dur = sum(c.get("duration_seconds", 0) for c in chunks)
        if total_dur > 0:
            durations.append(total_dur)

    # Cost metrics
    costs = [r.get("total_cost_usd", 0.0) for r in results if r.get("total_cost_usd") is not None]

    # Retry metrics
    retry_counts = []
    for r in results:
        for chunk in r.get("chunks", []):
            retry_counts.append(chunk.get("retry_count", 0))
    total_api_calls = len(retry_counts)
    calls_with_retry = sum(1 for rc in retry_counts if rc > 0)
    retry_rate = calls_with_retry / total_api_calls if total_api_calls > 0 else 0.0

    # Token usage totals
    total_input = sum(r.get("total_usage", {}).get("input_tokens", 0) for r in results)
    total_output = sum(r.get("total_usage", {}).get("output_tokens", 0) for r in results)
    total_cache_write = sum(r.get("total_usage", {}).get("cache_write_tokens", 0) for r in results)
    total_cache_read = sum(r.get("total_usage", {}).get("cache_read_tokens", 0) for r in results)

    # Cost totals
    total_cost = sum(costs)

    # Gate result breakdown
    gate_breakdown = defaultdict(int)
    for gr in gate_results:
        gate_breakdown[gr] += 1

    # Model breakdown
    model_breakdown = defaultdict(int)
    for r in results:
        model_breakdown[r.get("model", "unknown")] += 1

    # Alerts
    alerts = []
    if gate_pass_rate < GATE_PASS_RATE_ALERT and total >= 3:
        alerts.append({
            "severity": "HIGH",
            "metric": "gate_pass_rate",
            "value": round(gate_pass_rate, 3),
            "threshold": GATE_PASS_RATE_ALERT,
            "message": f"Gate PASS rate {gate_pass_rate:.1%} is below target {GATE_PASS_RATE_ALERT:.0%}",
        })

    error_rate = error_count / total
    if error_rate > API_ERROR_RATE_ALERT and total >= 3:
        alerts.append({
            "severity": "MEDIUM",
            "metric": "api_error_rate",
            "value": round(error_rate, 3),
            "threshold": API_ERROR_RATE_ALERT,
            "message": f"API error rate {error_rate:.1%} exceeds threshold {API_ERROR_RATE_ALERT:.0%}",
        })

    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "engagement_count": total,
        "gate": {
            "pass_count": pass_count,
            "fail_count": fail_count,
            "skip_count": skip_count,
            "pass_rate": round(gate_pass_rate, 4),
            "breakdown": dict(gate_breakdown),
        },
        "duration_seconds": {
            "p50": round(percentile(durations, 50), 1),
            "p95": round(percentile(durations, 95), 1),
            "p99": round(percentile(durations, 99), 1),
            "mean": round(sum(durations) / len(durations), 1) if durations else 0.0,
        },
        "cost_usd": {
            "mean": round(sum(costs) / len(costs), 4) if costs else 0.0,
            "p95": round(percentile(costs, 95), 4),
            "total": round(total_cost, 4),
        },
        "api_calls": {
            "total": total_api_calls,
            "with_retry": calls_with_retry,
            "retry_rate": round(retry_rate, 4),
        },
        "errors": {
            "count": error_count,
            "rate": round(error_rate, 4),
        },
        "tokens": {
            "total_input": total_input,
            "total_output": total_output,
            "total_cache_write": total_cache_write,
            "total_cache_read": total_cache_read,
        },
        "models": dict(model_breakdown),
        "alerts": alerts,
    }


# ── Human-readable output ────────────────────────────────────────────────────

def print_table(metrics: dict) -> None:
    n = metrics.get("engagement_count", 0)
    if n == 0:
        print("No engagement data found.", file=sys.stderr)
        return

    gate = metrics.get("gate", {})
    dur = metrics.get("duration_seconds", {})
    cost = metrics.get("cost_usd", {})
    api = metrics.get("api_calls", {})
    err = metrics.get("errors", {})
    alerts = metrics.get("alerts", [])

    print(f"\nPIO Framework — Production Metrics", file=sys.stderr)
    print(f"{'='*45}", file=sys.stderr)
    print(f"Engagements:      {n}", file=sys.stderr)
    print(f"Gate PASS rate:   {gate.get('pass_rate', 0):.1%}  (target: ≥95%)", file=sys.stderr)
    print(f"  PASS:           {gate.get('pass_count', 0)}", file=sys.stderr)
    print(f"  FAIL:           {gate.get('fail_count', 0)}", file=sys.stderr)
    print(f"  SKIPPED:        {gate.get('skip_count', 0)}", file=sys.stderr)
    print(f"Duration (API):   p50={dur.get('p50',0):.0f}s  p95={dur.get('p95',0):.0f}s  p99={dur.get('p99',0):.0f}s", file=sys.stderr)
    print(f"Cost per eng.:    mean=${cost.get('mean',0):.2f}  p95=${cost.get('p95',0):.2f}  total=${cost.get('total',0):.2f}", file=sys.stderr)
    print(f"Chunk retry rate: {api.get('retry_rate', 0):.1%}  ({api.get('with_retry',0)} / {api.get('total',0)} calls)", file=sys.stderr)
    print(f"API error rate:   {err.get('rate', 0):.1%}  (target: <5%)", file=sys.stderr)
    print(f"Models:           {metrics.get('models', {})}", file=sys.stderr)

    if alerts:
        print(f"\n{'!'*45}", file=sys.stderr)
        print(f"ALERTS ({len(alerts)}):", file=sys.stderr)
        for alert in alerts:
            print(f"  [{alert['severity']}] {alert['message']}", file=sys.stderr)
        print(f"{'!'*45}\n", file=sys.stderr)
    else:
        print(f"\n  All metrics within targets.", file=sys.stderr)


# ── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Blueprint Intake — Production Metrics Aggregator"
    )
    parser.add_argument(
        "--outputs-dir", type=Path, default=Path("outputs"),
        help="Root outputs directory to scan (default: ./outputs)",
    )
    parser.add_argument(
        "--since",
        help="Only include engagements started on or after this date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--json", action="store_true", dest="json_only",
        help="Suppress human-readable table; emit JSON to stdout only",
    )
    args = parser.parse_args()

    if not args.outputs_dir.exists():
        print(f"ERROR: outputs directory not found: {args.outputs_dir}", file=sys.stderr)
        sys.exit(2)

    since_dt: Optional[datetime] = None
    if args.since:
        try:
            since_dt = datetime.fromisoformat(args.since).replace(tzinfo=timezone.utc)
        except ValueError:
            print(f"ERROR: invalid --since date: {args.since} (expected YYYY-MM-DD)", file=sys.stderr)
            sys.exit(2)

    results = load_results(args.outputs_dir, since=since_dt)

    if not results:
        print(json.dumps({"engagement_count": 0, "alerts": []}))
        if not args.json_only:
            print("No pipeline_result_*.json files found.", file=sys.stderr)
        sys.exit(2)

    metrics = compute_metrics(results)

    print(json.dumps(metrics, indent=2))

    if not args.json_only:
        print_table(metrics)

    has_alerts = len(metrics.get("alerts", [])) > 0
    sys.exit(1 if has_alerts else 0)


if __name__ == "__main__":
    main()
