#!/bin/sh
set -eu
SIM=$(CDPATH= cd "$(dirname "$0")" && pwd)
RUN=$(CDPATH= cd "$1" && pwd)
ROOT=$(mise exec -- node --no-warnings -e 'const fs = require("node:fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).root);' "$RUN/meta.json")
TSX_TSCONFIG_PATH="$ROOT/packages/custom-widgets/tsconfig.json"
export ROOT TSX_TSCONFIG_PATH
TSX=$(mise exec -- node --no-warnings -e 'const { createRequire } = require("node:module"); const path = require("node:path"); process.stdout.write(createRequire(path.join(process.env.ROOT, "packages/custom-widgets/package.json")).resolve("tsx"));')
exec mise exec -- node --no-warnings --import "$TSX" "$SIM/sim.mts" call "$RUN" "$2"
