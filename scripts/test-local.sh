#!/bin/zsh
set -e
BASE="http://localhost:3000"
echo "Health"
curl -fsS "$BASE/healthz"
echo "\n\nStorage"
curl -fsS "$BASE/api/storage"
echo "\n\nAssessment campaign"
curl -fsS "$BASE/api/assessment-campaign" | head -c 800
echo "\n\nOffering values"
curl -fsS "$BASE/api/offering-values" | head -c 500
echo "\n\nEndpoint checks passed."
