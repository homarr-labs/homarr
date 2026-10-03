# Turbo caching, pnpm/Node dev toolchain

Real before/after input hashes compare dev 25120cd2b against these cache corrections. All 12 corrected invalidation assertions pass. The artifact sequence builds the real CLI and both DB migration bundles, reruns unchanged, deletes their outputs, and restores them; SHA-256 hashes remain identical.

Three sequential Docker controls use a fresh task-owned BuildKit builder. Cold builds all three tasks; an unrelated root development file forces COPY/RUN re-execution and restores all three tasks; a Next layout source edit rebuilds Next while retaining CLI/DB hits. App compile reuses the existing Next filesystem cache. Whole image timings include layer export and local import and are one sequence, not replicated package-manager speed estimates. Source mutations are restored after each harness.

`docker/cache-size.log` records the persistent compiled artifact cache footprint, including two Next task versions. The Docker script preserves exact measurement orchestration and task-owned paths; adjust those paths and initialize a new builder to reproduce.

Run `python3 scripts/benchmarks/turbo-cache.py --output benchmark-results/turbo-cache` with Node 24.18.0 and pnpm 11.15.1 dependencies installed. Raw logs replayed from a cache hit do not represent a new Next compilation.
