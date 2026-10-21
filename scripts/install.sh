#!/bin/zsh
set -e
REPO="/Users/mwolfe@digitalrealty.com/Projects/test-mike"
PACKAGE_DIR="${0:A:h:h}"
echo "Installing hybrid portfolio release into $REPO"
cp -R "$PACKAGE_DIR/." "$REPO/"
cd "$REPO"
npm install
echo "Install complete. Run: ./scripts/start-local.sh"
