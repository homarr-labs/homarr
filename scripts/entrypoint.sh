#!/bin/sh
set -e

# Creating folders in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis

chown -R nextjs:nodejs /appdata

# Change owner to allow homarr to read docker socket when mounted
DOCKER_SOCKET=/var/run/docker.sock
if [ -f "$DOCKER_SOCKET" ]; then
    chown -R nextjs:nodejs $DOCKER_SOCKET
fi

su-exec 1001:1001 "$@"