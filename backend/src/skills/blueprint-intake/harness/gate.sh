#!/usr/bin/env bash
# PIO Framework — Gate 1 wrapper (HR-01: LOCKED gate invocation point)
#
# Usage:  bash gate.sh <dossier_path>
# Exit:   0 = PASS, 1 = FAIL, 2 = ERROR
#
# Run this on the NATIVE MARKDOWN output from blueprint-intake, BEFORE any
# DOCX conversion. See docs/OPERATIONS.md §Gate Invocation Point Policy.

set -euo pipefail

DOSSIER_PATH="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="${SCRIPT_DIR}/validate_intake.py"

if [[ -z "${DOSSIER_PATH}" ]]; then
    echo "Usage: bash gate.sh <dossier_path>" >&2
    echo "Example: bash gate.sh outputs/BP-2026-001/dossier_BP-2026-001.md" >&2
    exit 2
fi

if [[ ! -f "${DOSSIER_PATH}" ]]; then
    echo "ERROR: File not found: ${DOSSIER_PATH}" >&2
    exit 2
fi

if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found in PATH" >&2
    exit 2
fi

if [[ ! -f "${VALIDATOR}" ]]; then
    echo "ERROR: validate_intake.py not found at ${VALIDATOR}" >&2
    exit 2
fi

# Run the harness; capture output so we can post-process the Section A word count (HR-06)
HARNESS_OUTPUT=$(python3 "${VALIDATOR}" "${DOSSIER_PATH}" 2>&1)
HARNESS_EXIT=$?
echo "${HARNESS_OUTPUT}"

# HR-06: Surface Section A word count as a prominent notice on every run
SEC_A_WORDS=$(echo "${HARNESS_OUTPUT}" | grep -oP "section_a_words: \K\d+" || true)
echo ""
if [[ -n "${SEC_A_WORDS}" ]]; then
    if [[ "${SEC_A_WORDS}" -gt 350 ]]; then
        echo ">>> SECTION A: ${SEC_A_WORDS} words — EXCEEDS hard ceiling of 350. Gate FAIL."
    elif [[ "${SEC_A_WORDS}" -ge 320 ]]; then
        echo ">>> SECTION A: ${SEC_A_WORDS} words — approaching ceiling (target 300, ceiling 350)."
    else
        echo ">>> SECTION A: ${SEC_A_WORDS} words — OK (target 300, ceiling 350)."
    fi
fi

echo ""
if [[ $HARNESS_EXIT -eq 0 ]]; then
    echo "GATE 1: PASS — dossier conforms to intake_v1.0. Safe to invoke blueprint-maturity."
    exit 0
elif [[ $HARNESS_EXIT -eq 1 ]]; then
    echo "GATE 1: FAIL — violations detected. See report above. DO NOT invoke blueprint-maturity."
    exit 1
else
    echo "GATE 1: ERROR — harness failed (exit code ${HARNESS_EXIT}). Check python3 installation and validate_intake.py."
    exit 2
fi
