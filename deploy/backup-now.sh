#!/usr/bin/env bash
set -Eeuo pipefail
root=/opt/metmma
exec 9>"$root/deploy.lock"
flock -w 1800 9
release=$(readlink -f "$root/current")
docker compose --env-file "$root/.env" --env-file "$release/release.env" -f "$release/compose.yml" run --rm --no-deps -T backup
