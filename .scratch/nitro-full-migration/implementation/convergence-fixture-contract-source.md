# Fixture contract source release

## Implemented exact five-file lease

Following PLANAPPROVE, the author changed only these existing source files:

| File                                                               | Released delta                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/backup-runtime/restore.test.ts`                  | Added only `NODE_ENV: "test"` to the existing synthetic child's allowlisted environment; retained the original PATH expression and spawn arguments/options.                                                                                              |
| `packages/api/src/nitro/routers/-settings-setup/capabilities.ts`   | Replaced the fetch property type with `(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>`; production JavaScript bodies unchanged.                                                                                                         |
| `packages/integrations/src/beszel/test/beszel-integration.spec.ts` | Wrapped the existing request mock in `Object.assign` with a real `vi.fn<typeof fetch.preconnect>()` property, using commas; removed the `as typeof fetch` assertion. Request implementation, assertions and original-fetch finally restoration retained. |
| `packages/integrations/src/beszel/test/beszel-session.spec.ts`     | Same checked fixture-only fetch shape; retained request branches, authentication counters, assertions and original-fetch afterEach restoration.                                                                                                          |
| `packages/forms-collection/src/icon-picker/icon-picker.spec.ts`    | Replaced obsolete client/session module mocks with checked injected view resources built from the existing query, permission and upload producers.                                                                                                       |

The icon fixture retains its query data and mutable loading/fetching/error flags. Its injected hook records exactly one `findIconsQuery` call per invocation, forwards the supplied options including placeholderData, and returns the existing query state plus a promise-shaped refetch mock. Permission state still resets before each test and enables upload through the existing `media-upload` fixture permission.

The supplied upload resource uses the existing uploadSelection mock, now resolving the existing `uploaded` media ID. The existing mocked UploadMedia child invokes this injected mock instead of also calling uploadSelection directly, passes the returned selected-media result to onSuccess, and supplies typed pending/disabled/idle/retry state. A captured mounted container and fixture lease determine ownership; afterEach revokes that lease before the original unmount and DOM cleanup. There is no permanent-true owner. The existing presentation overrides cannot replace required resources or onChange with undefined.

All existing test cases, assertions, debounce timing, fake-timer cleanup, permission resets and selected-media expectations remain in place. Their runtime behavior has not been executed or verified. This remains a pure-view upload fixture, not evidence about the real upload lifecycle, production authorization or caller data.

## Source evidence

Fresh source-only evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-fixture-contract-source-2sgiwokn`

- `before/` and `after/`: exact byte snapshots of the five leased files, preserving their relative source paths.
- `before-pins.json`: initial source byte lengths and SHA-256 pins.
- `after-pins.json`: before/after byte lengths and SHA-256 pins, plus per-file diff pins.
- `diffs/`: individual unified source diffs.
- `combined.diff`: combined five-file diff.

The two authorized evidence captures used Python `-I -S -B` with standard-library file I/O, hashing and difflib only. Evidence files were created with O_EXCL and mode 0600; directories were created under the approved TEMP location with mode 0700. Python did not edit product source; all five source changes used the required patch tool.

## Frozen handoff

The five source files and this new report are released frozen to the coordinator; the author will make no further changes without another lease. Shared Bun/CSS configuration, global environment definitions, compiler inclusions/exclusions, declarations, dependencies/lockfiles, production UI/UploadMedia, settings-check stub, legacy child helper and other producer files were untouched. No tests, comments, casts, suppressions, Fetch utilities or production runtime fallbacks were added.

No commands beyond the two authorized source-evidence captures were run. No checks, lint/format, compiler evaluation, test execution, native/SQL/engine/container work, private configuration/data access, network requests or nested agents were performed. Validation is pending, with no runtime-success claim.

After all active writers freeze, the coordinator owns fresh API, integrations and forms-collection typechecks, backend/Nitro composition sentinels, and scoped lint/format checks. Other legitimate diagnostics stay with their existing producer owners. Historical 28/37 and other baseline/failed results, compiled outputs and input manifests remain historical and immutable; none has been relabeled as current validation. The new source-only pins are not compiler or runtime receipts.
