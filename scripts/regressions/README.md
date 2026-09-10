# Release regression exploration

Run the opt-in grid fuzzer from the repository root after installing dependencies:

```sh
pnpm exec tsx --tsconfig apps/nextjs/tsconfig.json scripts/regressions/grid-fuzz.mts --seed 6545 --steps 1000
```

Change the seed to explore another repeatable sequence. `--seed` accepts unsigned
32-bit integers, including zero; `--steps` accepts 1–100,000 transactions. Each
transaction has one to four move or resize previews followed by commit or cancel.
The committed state becomes the next transaction's input. The fixture includes
two root grids and two nested containers with varying widths and row limits.

The runner calls the real v2 grid engine and checks placement identity and
metadata, integer geometry, bounds, overlap, container ownership, cycles,
immutable snapshots, repeat-preview stability, rejection retention, and exact
cancel/commit results. It does not start Homarr, Docker, or a browser. It uses
the Next.js app's TypeScript config to resolve the engine's existing imports.

A failure exits nonzero and writes the seed, source revision and hashes, initial
state, and operation transcript to `/tmp/homarr-grid-fuzz`. Use `--output <path>`
to keep artifacts elsewhere. Re-run the printed command on the same source to
reproduce it; changing engine or runner code can change a seed's outcome. Reduce
`--steps` to find the first failing transaction. Artifacts contain synthetic data.

Passing this runner covers v2 engine invariants only. It does **not** establish
parity with `dev`, browser rendering, save/reload persistence, or database upgrades.
The next useful differential checks are:

- Clone a seeded `dev` database, upgrade only its copy to v2, and compare widget
  identities/options/integrations through the category/dynamic-to-container
  migration (`packages/db/migrations/custom/0004_unify_sections_and_gutters.ts`).
- Drive the same saved board on both versions around layout breakpoints and
  compare visible widget counts, errors, containment, and save/reload outcomes.
  Use separate authenticated browser sessions and version-specific selectors;
  the existing `scripts/benchmarks/dev-board.mts` markers are v2-specific.
- Reuse mock integration fixtures from `e2e/lazy-widgets.spec.ts` and geometry
  checks from `e2e/media-server-layout.spec.ts`, keeping intentional v2 redesigns
  separate from missing behavior. Pixel equality is not a release criterion.
