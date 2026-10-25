# Visual and workflow regression tools

Research date: 2026-10-25. Repository inspected at `3f5cb84f705701c0748f8fb0aabdd9373e87109d`.

Status: research and recommendations for the design interview, not an accepted implementation plan. No application changes, dependency installations, browser tests, CI runs, or release checks were performed for this note.

## Finding

The lowest-cost candidate is a small, reproducible board in the real application, checked with the browser tooling already available: deterministic assertions for preserved behavior, matched screenshots for review, and agent exploration for cases the assertions miss. A component catalog can help development, but cannot by itself prove that an existing dashboard survives loading, editing, saving, and reloading.

For the reported regression, the decisive contract is: **a saved 2×1 container still occupies its intended one-row footprint, and remains editable and persistable as 2×1**. A screenshot of improved child tiles, a passing sizing-function test, or an LLM's approval of the new appearance does not establish that contract. This is a proposed product invariant derived from the incident, not a capability any tool can infer reliably for us.

No finite suite or LLM review guarantees that regressions never occur. A useful acceptance target is narrower and demonstrable: this known regression makes the sanity check fail, the accepted behavior passes, and future changes cannot silently replace that expectation.

## Existing investment

- Homarr already declares `@playwright/test` 1.61.1. Its E2E suite is driven by **Vitest**, importing Playwright browser APIs; it is not currently a Playwright Test project. See [package.json](../../package.json), [vitest.config.mts](../../vitest.config.mts), and [media-server-layout.spec.ts](../../e2e/media-server-layout.spec.ts).
- That media-server test already demonstrates useful browser geometry assertions, an isolated seeded database, reduced motion, and optional screenshots. Its instance helper starts a configured Homarr image. See [create-homarr-container.ts](../../e2e/shared/create-homarr-container.ts).
- An agent-browser script already exercises real UI paths and saves screenshots. See [ux-coherence-happy-paths.sh](../../scripts/browser-agent/ux-coherence-happy-paths.sh). That is reusable experience, not evidence that board sizing is covered.
- The installed agent-browser CLI reports version `0.34.0`; its `diff --help` exposes baseline screenshot comparisons and URL comparisons, and `trace --help` describes a Chrome DevTools trace. These were read-only capability checks.

See the separate [repository audit](visual-sanity-repository.md) for renderer/provider boundaries and the previous debug workbench. The recommendation here is to preserve the production rendering path while isolating its data and runtime.

## Tools and their actual roles

| Option                            | Useful capability                                                                     | Limitation for this incident                                                                     | Incremental cost                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Existing Vitest + Playwright APIs | Real browser actions, geometry and persistence assertions; current repository pattern | Screenshot capture alone is not a visual comparison gate                                         | Small focused scenarios and fixture setup                                         |
| A small Playwright Test project   | Native screenshot expectations, report/trace workflow, same browser actions           | Separate runner configuration; expected behavior and baseline approval remain our responsibility | Existing dependency; a narrow configuration and adapter, not a suite migration    |
| agent-browser                     | Agent exploration, screenshots, structural/pixel diffs, recordings                    | Exploration coverage is variable; observation is not an independently approved expectation       | Already installed; repeatable fixtures and retained evidence                      |
| Storybook                         | Named component states, provider decorators, interaction stories                      | Recreating board context can hide the real rendering or persistence defect                       | New packages, build configuration, stories, and maintained provider/mocking setup |
| Argos, optional                   | Hosted baseline selection and visual review attached to PRs                           | Screenshot review does not assert layout semantics; service defaults still need policy review    | SDK or CLI, service setup, credentials, and screenshot storage                    |

The capability details and sources follow. Cost judgments are inferences from those capabilities and the inspected repository, not measured implementation estimates.

### Playwright: the existing dependency is sufficient, but the runner matters

`toHaveScreenshot()` waits for stable consecutive captures and compares against a stored expectation. **It only works with the Playwright Test runner**, so adding it to the current Vitest browser files is not a drop-in change. A small dedicated Playwright Test configuration is an option without adding a new dependency. [Page screenshot assertion API](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)

Native visual comparisons use reference images, support explicit updates, and depend on the rendering environment. The docs warn that OS, browser, settings, hardware, and headless mode can change pixels. Consequently, capture base and head under the same controlled environment, and treat a reference-image update as a reviewable behavior change. [Visual comparisons](https://playwright.dev/docs/test-snapshots)

Playwright Trace Viewer provides action-level DOM snapshots, screenshots, source locations, and logs. The library tracing API also works outside its test runner, so Homarr's current Vitest browser tests could gain traces independently of a runner change. A trace is strong debugging evidence; it does not decide whether the observed behavior is correct. [Trace Viewer](https://playwright.dev/docs/trace-viewer)

Codegen records actions and helps choose locators, with explicit visibility/text/value assertions. It can accelerate a scenario's first draft; the saved-size and geometry expectations still need to be written and reviewed. [Test generator](https://playwright.dev/docs/codegen)

Playwright's official agents already cover exploration/planning, generation, and repair. This addresses part of the proposed “agent explores, then turns the flow into a test” workflow. A material caveat: the documented healer can finish with a **skipped test** when it believes functionality is broken. A required regression check must remain failing in that case; locator repairs and changed product expectations need different review. [Playwright Test Agents](https://playwright.dev/docs/test-agents)

### agent-browser: useful exploration and comparison, not the acceptance oracle

agent-browser supports accessibility-tree differences, pixel differences against a baseline image, and comparisons between URLs. Pixel output includes the mismatch percentage and a diff image; different image dimensions are reported separately. Its color-distance threshold is not an allowed percentage of changed pixels. A wrapper must interpret results deliberately rather than treating command completion as acceptance. [Diffing](https://agent-browser.dev/diffing)

The CLI supports user actions including drag/drop, screenshots, recordings, console/error inspection, and tracing. The installed CLI identifies its trace as Chrome DevTools format, which should not be confused with a Playwright Test trace/report. I did not find a documented agent-browser-to-Playwright-test exporter in the consulted command reference; record a short scenario with expected outcomes and implement the deterministic check explicitly. [Commands](https://agent-browser.dev/commands)

Recommended agent role: explore the affected feature and adjacent unchanged cases, collect evidence, then hand findings to a deterministic scenario. A second agent can inspect base/head/diff and the contract, but remains an additional reviewer, not a replacement for the contract or authority to approve a new baseline.

### Storybook: useful later for component variants

Stories can wrap the real component in context providers through decorators. Their `play` functions can exercise interactions and assert results, with the Vitest addon automating them. That makes Storybook useful for repeatable empty/loading/error states and isolated controls. [Provider decorators](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-providers), [interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)

The Next.js Vite integration supports routing/navigation and module mocks. Its React Server Component support is documented as experimental; server-only resources still need data-layer mocking. It is therefore not equivalent to running Homarr's full Next.js/auth/database path. [Next.js integration and RSC limitations](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite)

Inference for Homarr: use Storybook if a growing component-state catalog justifies its maintenance. A board-sizing hotfix should first be checked through the actual board renderer and editor. A story that bypasses parent scaling or supplies a simplified provider could look correct while the real dashboard remains broken.

### Argos: a plausible optional review service

Argos can upload screenshots from any test framework through its CLI. Its Playwright integration adds screenshot capture and a reporter that uploads screenshots/traces; changes become a PR check with a review UI. This could later improve review ergonomics without replacing the test scenarios. [Any-framework quickstart](https://argos-ci.com/docs/quickstart/any-test-framework), [Playwright quickstart](https://argos-ci.com/docs/quickstart/playwright)

Its baseline selection uses Git history and supports a reference commit override. However, current documented defaults include automatically approved branches, and some ancestor baseline candidates do not require approval. Do not equate automatic selection with a maintainer-approved reference. Inspect the actual chosen commit. [Baseline selection](https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build)

Current review semantics allow one approval to pass if no active rejection remains. Agent permissions and branch rules would therefore matter if we adopted it; the authoring agent should receive comparison access without independent baseline-approval authority. [Build review](https://argos-ci.com/docs/learn/review-workflow/review-a-build)

Homarr's [README](../README.md) contains an Argos sponsor badge, but the inspected workflows and dependency declarations do not establish an active application visual gate. Existing account entitlement and configuration remain unverified. No new service is necessary to prove the first container regression check.

## Proposed smallest useful experiment

This is a candidate to discuss, not authorization to implement all of it.

1. Seed a disposable instance with a normal board: an empty 2×1 container, a populated 2×1 container, and nearby one-row controls. Include one nested or scroll-capped case that the affected code actually touches.
2. Open the existing board without edits. Assert saved dimensions independently and measure the outer rendered footprint and neighbors. Checking stored height alone misses a render-only expansion; checking a child screenshot misses parent growth.
3. Set/create a 2×1 container through the real editor, save, reload, and reopen the editor. Assert dimensions and rendering again. Keep mutation requests real on this path so that persistence is tested.
4. Capture a full-board view plus a container detail at the reporter's viewport and a normal desktop viewport. Compare the exact same fixture and actions on pinned base and head.
5. Before trusting the check, run it against the known regressed revision and the accepted revision. It must fail for the unwanted extra row on the former and pass on the latter. This validation has not been performed by this research task.

The test expectation should come from the saved fixture and accepted user behavior, not from calling the same production sizing helper that is being changed. Measure row boundaries or compare to known one-row controls; do not assume a 2×1 cell has a literal 2:1 pixel ratio, because gaps and padding affect that ratio.

A successful first experiment demonstrates the contract and comparison loop without adding a second renderer, broad widget catalog, or full-instance setup through the UI on every case. Seed prerequisites directly; exercise the feature's important actions through the UI.

## Reproducibility and provenance

Proposed comparison record:

- Exact base and head SHAs, fixture/scenario revision, lockfile/runtime identity, and whether either source tree was dirty. Use separate checkouts and isolated instances; do not preserve an old component copy inside the product.
- Identical browser binary/version, OS, fonts, viewport, device scale, theme, locale, timezone, board scale and breakpoint settings.
- Explicit deterministic widget payloads and timestamps; owned local assets. Playwright can fix browser time and intercept browser requests, but those controls do not automatically freeze the server, cron jobs, or external integration responses. [Clock](https://playwright.dev/docs/clock), [mock APIs](https://playwright.dev/docs/mock)
- Wait for the intended ready state and loaded fonts/images. Keep the outer geometry visible; suppress only unrelated changing content. Masking the affected container would hide this regression.
- Run the same revision twice before trusting pixel differences. Instability is a fixture/environment defect to investigate, not a reason to widen the allowed difference until everything passes.
- Separate databases and cache/service state for base and head. Reset after each mutating scenario. Keep live provider data out of comparison fixtures while retaining real application save/load behavior.
- Retain before, after, diff, geometry/persistence results, and a short action trace under one scenario identity. A new head invalidates prior evidence for that head.

For a release check, record the tested candidate image digest as well as the source revision. Development-server evidence and candidate-image evidence answer different questions. The interview should decide when the latter is required; research alone does not establish a new release policy.

## Baseline ownership and decisions still open

The authoring agent may propose expected changes with evidence. An independently authorized reviewer accepts a changed contract or reference image. A missing baseline, skipped required scenario, unexpected geometry change, or unreviewed visual difference is incomplete evidence, not a pass. An LLM must not erase the failure by updating snapshots or weakening the assertion on its own.

Open decisions:

- Whether this starts as a mandatory gate for board/layout changes, a release smoke check, or both.
- Who can approve intentional appearance/contract changes, and what emergency exceptions require.
- Whether the first interface is an ordinary seeded dashboard plus report, a development-tools launcher, or a separate component catalog.
- The accepted local/CI runtime budget and initial viewport/scenario set.
- Whether local artifacts are sufficient or hosted review is worth service setup and maintenance.

## Research limits

Context7 successfully resolved Playwright, Storybook, and agent-browser, and returned version-specific Playwright screenshot documentation plus Storybook routing examples. Subsequent documentation requests hit the monthly quota. Further research used the linked owning documentation, not recalled API details. Higher Context7 limits require `npx ctx7@latest login` or `CONTEXT7_API_KEY`.

Live documentation can describe capabilities newer than repository pins. Screenshot assertions were checked against Playwright `v1.61.1` through Context7; agent-browser diff/trace commands were also checked against the installed CLI. Any adoption of test agents, Storybook, or Argos still needs a version-specific compatibility check. No claims of popularity, guaranteed detection, measured runtime, or current hosted-service entitlement are made.
