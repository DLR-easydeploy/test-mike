#!/bin/zsh
set -e
BASE="http://localhost:3000"
echo "Health:"
curl -fsS "$BASE/healthz"
echo "\nStorage:"
curl -fsS "$BASE/api/storage"
echo "\nGovernance queue sample:"
curl -fsS "$BASE/api/governance-queue" | head -c 500
echo "\n\nAll endpoint checks passed."
