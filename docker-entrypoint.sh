#!/bin/sh
set -e

# Ensure /data is writable by the nextjs user. Coolify-mounted volumes
# typically come up root-owned; chown at startup then drop privileges.
mkdir -p /data
chown -R nextjs:nodejs /data 2>/dev/null || true

exec su-exec nextjs:nodejs "$@"
