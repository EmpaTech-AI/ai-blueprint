#!/usr/bin/env bash
# freeze-green-stages.sh — PreToolUse guard (Edit/Write)
# ---------------------------------------------------------------------------
# No-regression guard for the S4-only remediation (2026-07-28).
# v37 has four GREEN stages — S1 Intake, S2 Maturity, S3 Opportunities,
# S5 Assembly — that reproduce their decision spine 4-for-4. During the S4
# (roadmap / REG-24) fix, NO edit may touch those stages' skills or content.
#
# BLOCKED : backend/src/skills/blueprint-{intake,maturity,opportunities,assembly}/**
# EXEMPT  : .../blueprint-intake/harness/**  (shared cross-stage test infra —
#           needed for the S4 seeded catch and checker; not S1 stage behavior)
# ALLOWED : blueprint-roadmap/** (S4), backend/src/utils, everything else.
#
# To lift the freeze: remove the two hook entries from .claude/settings.json
# (or delete this file). Outputs {"permissionDecision":"deny",...} to block,
# {} to allow. Never blocks on a parse failure (fail-open on unknown input).
set -euo pipefail

INPUT=$(cat)

# Extract file_path (grep fast-path, python fallback for escaped quotes)
FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
fi
if [ -z "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

# Normalize Windows backslashes and collapse slashes so the globs match.
NORM=$(printf '%s' "$FILE_PATH" | tr '\\' '/' | sed 's|/\+|/|g')

case "$NORM" in
  */blueprint-intake/harness/*)
    # Shared verification harness — editable during the S4 work.
    echo '{}'
    ;;
  */blueprint-intake/*|*/blueprint-maturity/*|*/blueprint-opportunities/*|*/blueprint-assembly/*)
    printf '{"permissionDecision":"deny","message":"[freeze] BLOCKED: %s is in a FROZEN GREEN stage (S1/S2/S3/S5). The S4 remediation must not touch these stages (no-regression guard). Editable: blueprint-roadmap (S4), backend/src/utils, and blueprint-intake/harness/ (shared test infra). To lift, remove the freeze hooks from .claude/settings.json."}\n' "$NORM"
    ;;
  *)
    echo '{}'
    ;;
esac
