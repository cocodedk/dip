#!/bin/sh
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo 'Installed pre-commit, commit-msg and owner-locked pre-push hooks.'
