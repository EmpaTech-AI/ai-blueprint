#!/usr/bin/env bash
# Independent full-suite verification — one command, for the validation analyst.
# House rule: author-reported results are [X] until re-run independently; this script is the re-run.
# Usage: bash backend/verify_all.sh   (from the repo root or backend/)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
PYTHON_BIN=""
for CAND in python3 python; do
  if command -v "$CAND" &>/dev/null && "$CAND" -c "import sys" &>/dev/null; then PYTHON_BIN="$CAND"; break; fi
done
[[ -z "$PYTHON_BIN" ]] && { echo "FATAL: no working python"; exit 2; }
H="src/skills/blueprint-intake/harness"; G="src/skills/blueprint-intake/golden/recruitment_meridian_v1.md"
FAIL=0
run() { echo "── $1"; shift; "$@"; local rc=$?; [[ $rc -ne 0 ]] && { echo "   ^^ FAILED (exit $rc)"; FAIL=1; }; }

run "App: typecheck"                npx tsc --noEmit
run "App: jest (incl. T-30 H-CORE-00 in-pipeline guard tests)"  npx jest --runInBand --silent
run "Harness: GATE 1 on golden"     bash "$H/gate.sh" "$G"
run "Harness: validator self-tests" "$PYTHON_BIN" "$H/tests/test_validate.py"
run "Harness: stability (golden vs golden)"  "$PYTHON_BIN" "$H/check_stability.py" "$G" "$G"
run "Harness: expectation vs SIGNED manifest" "$PYTHON_BIN" "$H/check_expectation.py" "$H/expected/BP-TEST-001_v1_1_expected.json" "$G"
run "Harness: three-seed battery"   "$PYTHON_BIN" "$H/tests/test_seeded_battery.py"
run "Manifest hash verify"          "$PYTHON_BIN" -c "
import json,hashlib,sys
d=json.load(open('$H/expected/BP-TEST-001_v1_1_expected.json',encoding='utf-8'))
want=d['signoff']['content_sha256']
got=hashlib.sha256(json.dumps({k:v for k,v in d.items() if k!='signoff'},sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
print('content_sha256 match:',want==got); sys.exit(0 if want==got else 1)"
echo "══════════════════════════════════════════"
[[ $FAIL -eq 0 ]] && echo "VERIFY_ALL: PASS — every suite green" || echo "VERIFY_ALL: FAIL — see above"
exit $FAIL
