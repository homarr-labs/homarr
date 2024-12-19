#!/bin/sh
set -e

echo $(whoami)
echo $(ls -la)
echo $(ls -la /appdata)

# Creating folders in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis

chown -R nextjs:nodejs /appdata

su-exec 1001:1001 "$@"