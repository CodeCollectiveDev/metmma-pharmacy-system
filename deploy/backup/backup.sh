#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${BACKUP_DATABASE_URL:?Set a direct Neon connection URL}"
: "${R2_ENDPOINT:?Set the R2 S3 endpoint}"
: "${R2_BUCKET:?Set the private backup bucket}"
: "${AWS_ACCESS_KEY_ID:?Set the R2 access key}"
: "${AWS_SECRET_ACCESS_KEY:?Set the R2 secret key}"
prefix=${R2_PREFIX:-metmma/production}
[[ $R2_ENDPOINT == https://* ]] || { echo 'R2_ENDPOINT must use HTTPS.' >&2; exit 1; }
[[ $prefix =~ ^[A-Za-z0-9/_-]+$ ]] || { echo 'Invalid R2_PREFIX.' >&2; exit 1; }
[[ $R2_BUCKET =~ ^[a-z0-9][a-z0-9.-]+$ ]] || { echo 'Invalid R2_BUCKET.' >&2; exit 1; }
# Use a URL without query parameters so these TLS settings cannot be overridden.
[[ $BACKUP_DATABASE_URL != *'?'* ]] || { echo 'Backup URL must omit query parameters; TLS verification is configured here.' >&2; exit 1; }
export PGDATABASE="$BACKUP_DATABASE_URL" PGSSLMODE=verify-full
export PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt PGCONNECT_TIMEOUT=30
export AWS_DEFAULT_REGION=auto AWS_EC2_METADATA_DISABLED=true
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
name="pharmacy-$(date -u +%Y%m%dT%H%M%SZ)-${HOSTNAME:-backup}.dump"
backup_dir=${BACKUP_DIR:-/backups}
file="$backup_dir/$name"
mkdir -p "$backup_dir"
trap 'rm -f "$file.partial"' EXIT
pg_dump --format=custom --no-owner --no-privileges --file="$file.partial"
test -s "$file.partial"
pg_restore --list "$file.partial" >/dev/null
mv "$file.partial" "$file"
cd "$backup_dir"
sha256sum "$name" > "$name.sha256"
aws --endpoint-url "$R2_ENDPOINT" s3 cp "$file" "s3://$R2_BUCKET/$prefix/$name" --only-show-errors
aws --endpoint-url "$R2_ENDPOINT" s3 cp "$file.sha256" "s3://$R2_BUCKET/$prefix/$name.sha256" --only-show-errors
# Check the remote object's size before considering the backup successful.
remote_size=$(aws --endpoint-url "$R2_ENDPOINT" s3api head-object --bucket "$R2_BUCKET" --key "$prefix/$name" --query ContentLength --output text)
[[ $remote_size == "$(stat -c %s "$file")" ]] || { echo 'Remote backup size mismatch.' >&2; exit 1; }
touch "$backup_dir/last-success"
echo "Backup verified in R2: $prefix/$name"
# Prune local copies only after a successful upload. Configure R2 retention separately.
find "$backup_dir" -maxdepth 1 -type f \( -name 'pharmacy-*.dump' -o -name 'pharmacy-*.dump.sha256' \) -mtime +7 -delete
