#!/bin/bash
set -u

mkdir -p /logs/verifier
python /verifier/test_outputs.py 2>&1 | tee /logs/verifier/output.txt
status=${PIPESTATUS[0]}

if [ "$status" -eq 0 ]; then
  echo 1 > /logs/verifier/reward.txt
else
  echo 0 > /logs/verifier/reward.txt
fi

exit 0
