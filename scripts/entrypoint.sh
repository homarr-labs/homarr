#!/bin/sh
set -e

# Creating folders in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis

echo $(whoami)
echo $(ls -la /appdata)

chown -R nextjs:nodejs /appdata

su-exec 1001:1001 "$@"