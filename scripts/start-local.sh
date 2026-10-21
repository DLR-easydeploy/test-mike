#!/bin/zsh
set -e
cd "/Users/mwolfe@digitalrealty.com/Projects/test-mike"
export PORT=3000
export DATABASE_PATH=./data/portfolio.db
npm start
