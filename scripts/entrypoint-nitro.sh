#!/bin/sh
set -eu

if [ "${HOMARR_NITRO_ACTIVATION:-}" != "accepted" ]; then
    echo "ERROR: Nitro candidate activation is held" >&2
    exit 1
fi

export PUID="${PUID:-0}"
export PGID="${PGID:-0}"
for file_var in $(env | cut -d '=' -f 1 | grep '_FILE$' || true); do
    target_var="${file_var%_FILE}"
    case "$target_var" in
        ''|[0-9]*|*[!A-Za-z0-9_]*) echo "ERROR: Invalid _FILE input name" >&2; exit 1 ;;
    esac
    file_path="$(printenv "$file_var")"
    if [ ! -f "$file_path" ] || [ ! -r "$file_path" ]; then
        echo "ERROR: Unreadable secret input for $target_var" >&2
        exit 1
    fi
    export "$target_var=$(tr -d '\n\r' < "$file_path")"
    unset "$file_var"
done

if [ "${HOMARR_NITRO_ACTIVATION:-}" != "accepted" ]; then
    echo "ERROR: Nitro candidate activation is held" >&2
    exit 1
fi

case "$PUID:$PGID" in
    *[!0-9:]*|:*|*:) echo "ERROR: PUID and PGID must be numeric" >&2; exit 1 ;;
esac

mkdir -p /appdata/db /appdata/trusted-certificates
if [ "$PUID" != "0" ] || [ "$PGID" != "0" ]; then
    chown "$PUID:$PGID" /appdata
    chown -R "$PUID:$PGID" /appdata/db /appdata/trusted-certificates
    exec su-exec "$PUID:$PGID" "$@"
fi

exec "$@"
