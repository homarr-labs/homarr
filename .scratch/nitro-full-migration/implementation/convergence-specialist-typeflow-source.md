# Specialist typeflow source freeze

Approved plan applied: `.scratch/nitro-full-migration/convergence-specialist-typeflow-plan.md`. The two-file source lease is released; no further production edits are planned in this session.

## Exact production cuts

- `packages/integrations/src/native-clients/specialists/traefik.ts:32`: `resources.reduce(` → `resources.reduce<TraefikResourceSummary>(`.
- `packages/integrations/src/native-clients/systems/openmediavault.ts:36`: `async (http) => {` → `async (http): Promise<IntegrationHttpAuthentication> => {` in the existing authentication-producing `runAsync` callback.

Both types were already imported. Source byte comparison against captured originals established that every byte outside these two annotations is unchanged, including counters, header names/values, redaction, parser, endpoints, authentication, and lifecycle. No libraries, imports, casts, `any`, tests, comments, or suppressions were added.

## Frozen evidence

Directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-specialist-typeflow-source-2jqy3jxh`.

The directory is mode `0700`; evidence files were created exclusively with `O_EXCL` and mode `0600` using bounded Python `-I -S -B` stdlib file capture, SHA-256, and difflib only.

Files: `traefik.ts.before`, `traefik.ts.after`, `traefik.ts.diff`, `openmediavault.ts.before`, `openmediavault.ts.after`, `openmediavault.ts.diff`, `before-pins.json`, and `freeze.json`. The freeze includes source associations, byte lengths, before/after/diff pins, and the outside-annotation byte comparison.

| Source         | Before SHA-256                                                     | After SHA-256                                                      |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Traefik        | `4f0d1060679612c135004fe95fd07a3a58810e1917ee18083e72d55158a5e908` | `f07bb47891641ea4a95ff71eba372c125179e679770058eef7b63deb479f4f75` |
| OpenMediaVault | `e15997c851c56b7942a0809a05603dac705b779514b7f2b2cf67bfc081c6d078` | `1bf8ee85adaadd86754acecf0d95f2ddf9e046cf2853962341fdc3f727fb44c1` |

`freeze.json` SHA-256: `1398981ced43a600a449832cb405aa60d07ef5d76738c52c2fc74dfa4d3aae4f`.

## Validation boundary

No lint, typecheck, compilation, tests, runtime/native/Engine execution, network, or nested-agent work was performed. The six recorded production diagnostics are expected to disappear, not verified as removed. Coordinator validation remains pending until all editors freeze; no clean typecheck is claimed.

The existing Bun fetch-mock `preconnect` diagnostics in `packages/integrations/src/beszel/test/beszel-integration.spec.ts:96` and `packages/integrations/src/beszel/test/beszel-session.spec.ts:113` remain separate fixture-owner work and were not touched. Original compiled outputs and their input association were not modified. Disjoint editors' files, namespace/cache/private-producer source holders, and the stipulated old-69/widget/integration-89 source-count baseline were not changed; no runtime activation claim follows from source counts.
