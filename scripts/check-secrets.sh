#!/bin/sh
# Fails if anything tracked by git looks like a credential. Run before every commit.
set -eu
PATTERN='(sk_(test|live)_[A-Za-z0-9]{8,}|pk_(test|live)_[A-Za-z0-9]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY|(SECRET|PASSWORD|ENCRYPTION_KEY)[A-Z_]*[=:][[:space:]]*["'"'"']?[0-9a-fA-F]{16,}|"(password|secret|apiKey|accessToken)"[[:space:]]*:[[:space:]]*"[^"]+")'
if git grep -nIE "$PATTERN" -- . ':!package-lock.json'; then
  echo "Possible secret found above. Remove it before committing." >&2
  exit 1
fi
echo "No secrets found in tracked files."
