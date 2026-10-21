#!/bin/zsh
set -e
BASE="http://localhost:3000"
echo "Health"
curl -fsS "$BASE/healthz"
echo "\n\nStorage"
curl -fsS "$BASE/api/storage"
echo "\n\nView model"
curl -fsS "$BASE/api/view-model" | head -c 600
echo "\n\nGovernance"
curl -fsS "$BASE/api/governance-queue" | head -c 500
echo "\n\nChecks passed."
