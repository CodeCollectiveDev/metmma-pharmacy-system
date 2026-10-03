#!/usr/bin/env bash
# Run as the dedicated Docker-capable deploy user. No repository checkout on the VPS.
set -Eeuo pipefail
umask 077
release_id=${1:?Usage: deploy.sh RELEASE_ID}
initialize=${2:-false}
[[ $initialize == true || $initialize == false ]] || { echo 'Invalid initialization option.' >&2; exit 1; }
[[ $release_id =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID.' >&2; exit 1; }
root=${METMMA_DEPLOY_ROOT:-/opt/metmma}
incoming=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
test -s "$root/.env"
test -s "$root/backend.env"
test -s "$root/backup.env"
exec 9>"$root/deploy.lock"
flock -w 1800 9
cd "$incoming"
sha256sum --check images.tar.gz.sha256
gzip -dc images.tar.gz | docker load
release="$root/releases/$release_id"
mkdir -p "$release"
cp compose.yml Caddyfile backup-now.sh "$release/"
printf 'RELEASE_ID=%s\n' "$release_id" > "$release/release.env"
compose=(docker compose --env-file "$root/.env" --env-file "$release/release.env" -f "$release/compose.yml")
"${compose[@]}" config --quiet
# Pause writes before the final snapshot. A failure leaves the API stopped.
"${compose[@]}" stop api
fail_release() {
  trap - ERR HUP INT TERM
  echo 'Release failed. API remains stopped; inspect logs before reopening writes.' >&2
  "${compose[@]}" stop api || true
  exit 1
}
trap fail_release ERR HUP INT TERM
"${compose[@]}" run --rm --no-deps -T backup
if [[ $initialize == true ]]; then
  "${compose[@]}" run --rm --no-deps -T api npm run db:init
fi
"${compose[@]}" run --rm --no-deps -T api npm run migrate
"${compose[@]}" up -d --wait --wait-timeout 180 api
"${compose[@]}" up -d proxy
# Check the HTTPS route, including Caddy/DNS/TLS, before marking the release current.
domain=$("${compose[@]}" exec -T proxy printenv API_DOMAIN)
curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 --max-time 10 "https://$domain/api/health"
if [[ -L "$root/current" ]]; then
  ln -sfn "$(readlink "$root/current")" "$root/previous"
fi
ln -sfn "$release" "$root/current"
trap - ERR HUP INT TERM
echo "Deployed $release_id"
# The immutable images and release manifests stay available for reviewed rollback.
rm -f "$incoming/images.tar.gz"
