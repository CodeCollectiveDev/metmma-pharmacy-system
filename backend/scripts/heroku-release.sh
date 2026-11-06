#!/bin/sh
set -eu

run_with_retry() {
  attempt=1
  until "$@"; do
    if [ "$attempt" -ge 3 ]; then
      echo "Command failed after $attempt attempts: $*" >&2
      return 1
    fi
    echo "Attempt $attempt failed; retrying in 15 seconds..." >&2
    sleep 15
    attempt=$((attempt + 1))
  done
}

# Production already has a database. Never run the initializer during release.
run_with_retry npm run migrate
