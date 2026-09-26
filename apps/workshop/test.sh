#!/bin/sh
set -eu

go -C apps/workshop test ./...
node apps/workshop/tests/workshop-contracts.mjs
node apps/workshop/tests/workshop-migration.mjs
