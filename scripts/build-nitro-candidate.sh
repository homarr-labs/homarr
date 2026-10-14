#!/usr/bin/env bash
set -euo pipefail

if [ "${HOMARR_NITRO_ACTIVATION:-}" != "accepted" ]; then
    echo "ERROR: Nitro candidate build requires explicit accepted activation" >&2
    exit 1
fi

BUILD_ROOT="${HOMARR_NITRO_BUILD_ROOT:?Supply a fresh absolute HOMARR_NITRO_BUILD_ROOT}"
case "$BUILD_ROOT" in
    /*) ;;
    *) echo "ERROR: HOMARR_NITRO_BUILD_ROOT must be absolute" >&2; exit 1 ;;
esac
if [ -e "$BUILD_ROOT" ] || [ -L "$BUILD_ROOT" ]; then
    echo "ERROR: HOMARR_NITRO_BUILD_ROOT must not already exist" >&2
    exit 1
fi

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPOSITORY_ROOT"

bun --no-env-file run --filter @homarr/nitro build --configLoader native

ARTIFACT="$BUILD_ROOT/artifact"
test -s "$ARTIFACT/server/index.mjs"
test -d "$ARTIFACT/public"
test ! -L "$REPOSITORY_ROOT/scripts/migrate-nitro.mjs"
test -s "$REPOSITORY_ROOT/scripts/migrate-nitro.mjs"

mkdir "$BUILD_ROOT/migration-build" "$BUILD_ROOT/cli-build"
mkdir "$BUILD_ROOT/migration-build/sqlite" "$BUILD_ROOT/migration-build/postgresql"
./node_modules/esbuild/bin/esbuild packages/db/migrations/sqlite/migrate.ts --bundle --platform=node --external:bun:sqlite --outfile="$BUILD_ROOT/migration-build/sqlite/migrate.cjs"
./node_modules/esbuild/bin/esbuild packages/db/migrations/postgresql/migrate.ts --bundle --platform=node --external:bun:sqlite --outfile="$BUILD_ROOT/migration-build/postgresql/migrate.cjs"
./node_modules/esbuild/bin/esbuild packages/cli/src/index.ts --bundle --platform=node --external:bun:sqlite --external:bcrypt --external:cpu-features --loader:.html=text --loader:.node=text --outfile="$BUILD_ROOT/cli-build/cli.cjs"

mkdir "$ARTIFACT/db" "$ARTIFACT/scripts" "$ARTIFACT/cli"
mkdir "$ARTIFACT/db/migrations" "$ARTIFACT/db/migration-runners"
for DIALECT in sqlite postgresql; do
    SOURCE="$REPOSITORY_ROOT/packages/db/migrations/$DIALECT"
    TARGET="$ARTIFACT/db/migrations/$DIALECT"
    SYMLINK="$(find "$SOURCE" -type l -print -quit)"
    if [ -n "$SYMLINK" ]; then
        echo "ERROR: Migration assets must not contain symlinks" >&2
        exit 1
    fi
    mkdir "$TARGET"
    for MIGRATION in "$SOURCE"/*.sql; do
        test -f "$MIGRATION"
        cp "$MIGRATION" "$TARGET/"
    done
    cp -R "$SOURCE/meta" "$TARGET/meta"
    cp "$BUILD_ROOT/migration-build/$DIALECT/migrate.cjs" "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
    test -s "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
    test -s "$TARGET/meta/_journal.json"
done
cp "$REPOSITORY_ROOT/scripts/migrate-nitro.mjs" "$ARTIFACT/scripts/migrate-nitro.mjs"
cp "$BUILD_ROOT/cli-build/cli.cjs" "$ARTIFACT/cli/cli.cjs"
for DIRECTORY in "$ARTIFACT" "$ARTIFACT/server" "$ARTIFACT/server/node_modules" "$ARTIFACT/cli" "$ARTIFACT/server/node_modules/bcrypt" "$ARTIFACT/server/node_modules/node-gyp-build" "$ARTIFACT/server/node_modules/bcrypt/prebuilds"; do
    test -d "$DIRECTORY"
    test ! -L "$DIRECTORY"
done
for PACKAGE in bcrypt node-gyp-build; do
    SOURCE="$ARTIFACT/server/node_modules/$PACKAGE"
    INVALID_ENTRY="$(find "$SOURCE" ! -type f ! -type d -print -quit)"
    if [ -n "$INVALID_ENTRY" ]; then
        echo "ERROR: CLI runtime packages must contain only regular files and directories" >&2
        exit 1
    fi
done
for FILE in bcrypt/package.json bcrypt/bcrypt.js bcrypt/promises.js node-gyp-build/package.json node-gyp-build/index.js node-gyp-build/node-gyp-build.js; do
    test -f "$ARTIFACT/server/node_modules/$FILE"
    test -s "$ARTIFACT/server/node_modules/$FILE"
done
mkdir "$ARTIFACT/cli/node_modules"
cp -pR "$ARTIFACT/server/node_modules/bcrypt" "$ARTIFACT/cli/node_modules/bcrypt"
cp -pR "$ARTIFACT/server/node_modules/node-gyp-build" "$ARTIFACT/cli/node_modules/node-gyp-build"

test -s "$ARTIFACT/server/index.mjs"
test -d "$ARTIFACT/public"
test -s "$ARTIFACT/cli/cli.cjs"
test -s "$ARTIFACT/scripts/migrate-nitro.mjs"
