# PACK CLI packaging correction

Status: source edit frozen; ready for independent source review and authorized validation. No commands, checks, builds, imports, or native execution were run.

## Exact scope

Only `scripts/build-nitro-candidate.sh` and this new implementation record were changed. The script adds one block immediately after the existing CLI copy line; all existing lines remain unchanged.

The block requires physical, nonsymlink artifact, server, server/node_modules, CLI, bcrypt, node-gyp-build, and bcrypt/prebuilds directories. It rejects any descendant of either source package that is not a regular file or directory using the existing find/conditional-error/exit pattern. It requires nonempty regular bcrypt/package.json, bcrypt.js, promises.js, node-gyp-build/package.json, index.js, and node-gyp-build.js files.

A fresh artifact/cli/node_modules directory is created with plain mkdir. Both complete Nitro-traced package directories are copied from inside the new artifact with cp -pR, preserving the traced bcrypt prebuild set, including all ten prebuilds when present in the completed traced package. There is no host node_modules package source, symlink target, installation, pruning, native compilation, extra optional package, alias, or bundle/external change.

## Preserved boundaries

Build activation, absent-root and output guards, closed SQL/meta roots, sibling migration runners, modes, source checks, environment handling, route freeze, and failure flow remain unchanged. The current third artifact remains immutable with its unresolved CLI P1; this edit does not repair or rebuild that artifact.

Any fourth build remains deferred until all product authors are frozen and independent review/checks are complete, with K pinning and D's native gate still required. AW3 runtime/assembly independent-review acceptance and the unreachable private cache-control author stage are unchanged.

Actual addon loading, tslib, PostgreSQL, D, and boot holds remain unresolved and unchanged. This source correction is not runtime acceptance or authorization to rebuild.
