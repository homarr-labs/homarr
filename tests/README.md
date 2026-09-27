# Regression contracts

Test the failures that break a connection or lose a user's state. Use production adapters and routers with real HTTP, SQLite and Redis. The external HTTP service is a controlled protocol fixture; it is not evidence that the latest upstream release is compatible.

## Failures to protect, before implementation

| Boundary                           | Plausible regression                                                            | Independent observation                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Service authentication and routing | Header omitted, login/session reused incorrectly, proxy subpath lost            | Server accepts only the documented request; adapter returns the expected widget data |
| Service responses                  | Upstream fields change, empty/error payload becomes misleading success          | Known fixture produces explicit output; HTTP/schema failures surface as errors       |
| Media feeds                        | Pagination truncates results, timestamps/bitrate map incorrectly                | Complete expected records from fixed protocol examples                               |
| Integration management             | Secrets returned in plaintext, unauthorized edits, stale credentials after save | Real router results and persisted encrypted data across operations                   |
| Board access and persistence       | Private board leaks or saved state is lost                                      | Real caller reads after writes and rejected unauthorized requests                    |
| Harness integrity                  | Wrong request causes the expected rejection and falsely passes                  | Every fixture request is independently checked, including failure scenarios          |

Fixture-specific requirements and provenance live beside their payloads. Record those before adding a scenario. Assertions must use independently chosen expected results, never results regenerated from the implementation under test.

## Working rules

- Add a scenario only for a concrete integration breakage, security boundary, data-loss risk, or reported regression. A changed function does not imply a new test.
- Exercise public behavior across real boundaries. Do not mock the adapter, transport, permission decision or mapper that the scenario claims to test.
- Use one representative journey per distinct failure. Keep setup shared and assertions on observable results; avoid property inventories, copied constants and component/layout tests.
- Changes to an adapter and its protocol fixtures are reviewed together. Do not automatically update expected output to make CI green. Record upstream evidence when changing a fixture.
- A passing fixture proves Homarr handles that fixture, not every upstream version. Unknown/untested integrations must remain visible in the report.
- Keep the suite deterministic and bounded. No real user credentials, internet-dependent tests or paid API calls in default CI.

## Running and evidence

Use Node and pnpm versions declared by the repository, install dependencies, and make `redis-server` available on PATH. No existing Redis or application database is needed. The runner creates a temporary authenticated Redis instance and migrated SQLite database, then removes them.

```sh
pnpm test network.contract.test.ts
pnpm test media.contract.test.ts
pnpm test flows
```

Run only the relevant files while changing code. CI runs the small complete contract suite with `pnpm test`, including dependency-only changes, and requires its result before the build gate. Existing database gate names are retained for branch protection compatibility.

Each run replaces `artifacts/tests/results.json` and `manifest.json`. The manifest records the revision, dirty worktree status, selected files, runtime, fixture hashes, and result counts. CI uploads this directory on success or failure; setup failures before the runner starts may have no artifact. Reproduce from the recorded revision, dependency lockfile, fixture hashes, and command. A dirty-worktree run additionally requires its uncommitted diff.

## Keeping contracts current

When a provider protocol or adapter changes, review its fixture provenance and failure modes alongside the production change. Refresh fixtures from a cited upstream specification or a redacted response from an identified provider version. Record the version and capture/source date; synthetic examples must remain labeled synthetic. Never replace expectations solely because the implementation returns something different.

These deterministic contracts detect regressions against the recorded examples. They do not poll upstream releases or establish compatibility with current live providers. Coverage currently starts with WUD, Gluetun, Sonarr, Radarr, Jellyfin and Nextcloud plus selected internal flows. Other integrations, live provider compatibility, PostgreSQL behavior, browser interactions and upgrades of existing databases remain outside this suite. Add another scenario only when its concrete risk earns ongoing maintenance.

## Demonstrating regression detection

`pnpm exec tsx tests/prove-regressions.mts` is an opt-in proof: it requires a green baseline, temporarily breaks authentication, progress mapping and authorization one at a time, requires the corresponding behavioral assertion to fail, restores each source file, and requires a green final run. Run without concurrent source edits or contract runs. Reports, source hashes and recovery copies are saved under `artifacts/regressions/`. This proves three representative regressions, not exhaustive mutation coverage.

See [VALUE.md](VALUE.md) for each scenario’s value and retention rationale.
