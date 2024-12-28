#!/bin/sh
set -e

# Create group and users
addgroup --system --gid $PGID homarr
adduser --system --uid $PUID --ingroup homarr external_user
adduser --system --uid $INTERNAL_PUID --ingroup homarr internal_user

# Change owner of existing directories
chown -R $PUID:$PGID /secrets
# Allow homarr group to write to secrets
chmod -R g+w /secrets

# Creating folders in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis

chown -R $PUID:$PGID /appdata
# Allow homarr group to write to appdata folder
chmod -R g+w /appdata

# Change owner to allow homarr to read docker socket when mounted
DOCKER_SOCKET=/var/run/docker.sock
if [ -r "$DOCKER_SOCKET" ]; then
    chown $PUID:$PGID $DOCKER_SOCKET
    # Allow homarr group to write to docker socket
    chmod g+w $DOCKER_SOCKET
fi

su-exec $INTERNAL_PUID:$PGID "$@"