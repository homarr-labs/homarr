# Request type-flow source release — frozen

## Approved delta

Applied only the independently approved type-only cut from `convergence-request-typeflow-plan.md` to these two product files:

1. `packages/request-handler/src/nitro-bindings/factories.ts`: the existing widget-runtime call now explicitly supplies `<TData, TInput>`.
2. `packages/request-handler/src/nitro-bindings/releases.ts`: added the local `DockerHubRepositoryPath` union and annotated the existing `relativeUrl` declaration with it.

Product edits used `tools.patch`. No optional runtime guards from the plan were applied. No casts, helpers, comments, tests, dependencies, global type weakening or other product edits were added. Existing JavaScript expressions/control flow, constructed URLs, options, producer signatures, cache/caps/generations, HTTP physical-settlement behavior, statistics and cancellation remain unchanged by this delta. This is not a validated-origin or no-cross-origin-redirect claim.

## Exact source-only evidence

New evidence root:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-request-typeflow-source-877ffecc221a
```

Captures used only `python3 -I -S -B` with standard-library file I/O, hashing and difflib. New evidence directories were created with mode `0700`; every evidence file used `O_EXCL` and mode `0600`.

Files in that root:

- `before/factories.ts`, `before/releases.ts`: exact original source bytes.
- `after/factories.ts`, `after/releases.ts`: exact frozen after-source bytes.
- `diffs/factories.ts.diff`, `diffs/releases.ts.diff`: complete unified diffs.
- `before-pins.json`: original before pins and initially predicted after pins, preserved unchanged.
- `capture-interruption.json`: records the initial multiline expected-pin mismatch and preservation of the partial capture.
- `after-pins.json`: final actual source/diff pins and exact approved-replacement byte comparison.

The patch tool rendered the approved three-line path union onto one line. The first after-capture rejected that expected-byte mismatch after capturing the factory; it did not overwrite prior evidence. The final capture preserved and byte-compared the existing factory evidence, captured the release source/diff with exclusive creation, and confirmed that all bytes match only the approved replacements with that union formatting. No source re-edit or compiler/formatter invocation followed the mismatch. The final releases pin below, not the initial multiline prediction, identifies its actual frozen bytes.

| Product file   | Before bytes | After bytes | Before SHA-256                                                     | After SHA-256                                                      |
| -------------- | -----------: | ----------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `factories.ts` |         6156 |        6171 | `f61b9157cb3d961f608c2cb720cede690413a6977476e7edd2b47d052993e95b` | `e4e64ec8738677d2e83a9cdce7dc8b9185d741b0f80bb00e1e7dc275e5f350b0` |
| `releases.ts`  |        33281 |       33427 | `bde8d86f2818470e7f30c24e4db5ebd58487f04950ef2c8563612d4b33a1053b` | `05b5d1568de7e1ff7b97a5c962285911060b4b1a7fb8606d6f66ae6f7d35c92f` |

Diff SHA-256 pins:

- `diffs/factories.ts.diff`: `d2caddf05d2565e7fdc06ba1080af9184b4bb71d61a6bd8910fa3e71c5aa3de2`.
- `diffs/releases.ts.diff`: `5d76f20513e2d6437cc35a62603812814b66af6f8157e738ff56f6b126f79cad`.

## Freeze and validation handoff

**Both product files are frozen; this author releases the lease.** The evidence is source-only, not a lint/typecheck result. During this author release, no other commands/checks, imports/evaluation, compilation, SQL/Engine/native operations, network calls, private configuration/data access or nested agents were performed. Source reads and this new report were the only additional actions. The earlier plan and all historical receipts remain unchanged.

Coordinator owns fresh focused request-handler `noEmit` and two-file lint after freeze, plus any separately required changed-program checks. No broad tests or new tests are requested. A green result must be freshly associated with these actual pins, not inherited from the supplied earlier diagnostic capture. No current artifact association, runtime activation, publication, or change to runtime `91/334/0/9` is asserted. Other writers' fixture/format work and frozen editor/specialist/App/core/Auth/schema/config scopes were not edited by this author.
