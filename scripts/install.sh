#!/bin/zsh
set -e
REPO="/Users/mwolfe@digitalrealty.com/Projects/test-mike"
PACKAGE_DIR="${0:A:h:h}"
echo "Installing Portfolio Data + Value release into $REPO"
cp -R "$PACKAGE_DIR/." "$REPO/"
cd "$REPO"
npm install
echo "Installed. Start with: $REPO/scripts/start-local.sh"
