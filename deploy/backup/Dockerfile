# A newer pg_dump can read older PostgreSQL servers (16–18).
FROM postgres:18-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends awscli ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY deploy/backup/backup.sh /usr/local/bin/metmma-backup
ENTRYPOINT ["bash", "/usr/local/bin/metmma-backup"]
