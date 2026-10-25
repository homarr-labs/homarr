# Visual and workflow sanity checks — design interview

Status: targeted-check policy accepted; a throwaway UI prototype is authorized to make the workbench concrete before full implementation.

## Problem

The container change in #7265 made nested app tiles square by increasing container footprints. It passed the reporter's visual check while violating existing saved dimensions, including empty 2×1 containers. #7363 restored the previous sizing and shipped in v2.9.1. The proposed validation must distinguish an intended improvement from changes to behavior that existing users rely on.

Sources: [original report](https://github.com/homarr-labs/homarr/issues/7247), [original change](https://github.com/homarr-labs/homarr/pull/7265), [hotfix and matched screenshots](https://github.com/homarr-labs/homarr/pull/7363).

## Requested outcome

A simple, automatically populated workbench for real Homarr components, containers, and widgets; inspect pinned before/after versions, exercise user actions, and make useful evidence available to agents and maintainers before release. Investigate reuse of the development tools and browser tests before introducing another framework.

## Accepted decisions — round 1

1. Enforcement is blocking, with explicit maintainer exceptions. Select checks for affected features rather than running an exhaustive CI suite for every change. Seed prerequisites such as authentication and fixture data for speed, and run independent scenarios in parallel with isolated state.
2. An independent agent may accept explained appearance changes. Changes to behavior guarantees, such as preserving saved dimensions, require the maintainer's decision. The implementing agent cannot approve its own replacement baseline.
3. Start with containers, representative items, move/resize, collapse, and save/reload. Build extensible fixtures before expanding to every widget and component.

Recorded in [ADR 0002](../adr/0002-targeted-visual-sanity-checks.md). These decisions select policy and initial scope; the implementation design is still open.

## Accepted decisions — round 2

4. Select representative scenarios through an explicit changed-file/dependency mapping. Agents may add checks. Unmapped changes require an explicit coverage decision instead of silently passing.
5. Run the selected affected scenarios on the already-built release image before publication. Cover changes since the last validated release, not only the latest push. Reuse the candidate image without a second build or exhaustive suite.
6. Target at most 60 seconds for warm local checks and 3 minutes for selected CI checks once the app/image is ready. Report startup/build time separately. These are targets to measure, not existing performance claims; overruns must not silently drop checks.

## Prototype direction — round 3

7. The maintainer delegated the comparison-model choice and requested a fast prototype because the workbench's shape was unclear. Use pinned before/after code versions as the implementation candidate; the prototype uses explicitly labeled recorded captures and a simulated runner to evaluate the experience.
8. Chrome on Linux is accepted as the initial browser environment. Representative affected desktop/tablet/mobile scenarios remain the intended first coverage.

The prototype asks: can a maintainer quickly understand what was checked, see the relevant before/after change, and tell why a release is blocked? Explore three structurally different views on one development-only route: comparison workspace, selected-run report, and guided review. This is throwaway interface code, not a working validation gate or a claim of new E2E coverage.

## Proposed first-slice delivery

- A lightweight development entry point and local report for selected seeded board scenarios, using the real application renderer and editor. Expose reset, before/after/diff, and links to inspect the instances; avoid another component framework or copies of production components.
- Seed synthetic users, sessions, and board data directly when they are prerequisites. Exercise the feature under test through real UI actions; auth scenarios retain real login. Isolate worker state, browser cookies, ports, and report outputs.
- Deterministic checks cover saved/rendered footprint, neighbor placement, move/resize, collapse, and save/reload. Include empty, populated, labeled, nested, and scrollable containers where affected.
- Agents explore the changed area and propose durable scenarios. An independent reviewer considers intended visual changes against preserved behavior. Missing evidence, skipped required scenarios, unstable fixtures, and stale commit/image identity cannot be silently reported as a pass.
- Keep source/image/fixture/environment identity with the selected scenarios and selection reasons. A new head invalidates old head evidence. Failures retain screenshots, differences, assertions, and relevant action traces.
- Prove that the initial checker fails on the known regression and passes on the hotfix before enabling it as a gate. Measure the agreed runtime targets. Record only warranted agent workflow instructions, with detailed operational steps linked from the entry point.

These delivery details describe the eventual gate. The current authorized work is the throwaway UI prototype; the runner, automated comparisons, and CI wiring are still unimplemented.

## Proposed validation of the validator

Replay the same fixture and actions against the regression and hotfix. Require the saved/rendered 2×1 footprint check to fail on v2.9.0 and pass on v2.9.1. Confirm a deliberate appearance-only change is distinguishable from a behavior violation. This is a proposed acceptance criterion, not a completed test.

## Research

- [Repository assets and gaps](visual-sanity-repository.md) — source audit complete; no application execution.
- [Current tools and tradeoffs](visual-sanity-tools.md) — primary-source research complete; version/adoption checks remain conditional on design.

## Findings available for the next round

The current widget preview omits the production board grid and persistence; existing browser helpers can provision a real disposable instance. Current required CI and release workflows lack a board browser sanity gate. The previous snapshot playground was reverted after alignment problems, so reuse must preserve the production renderer and provider boundaries. Existing mock data also needs deterministic fixtures. See the source-linked repository audit.

The leading candidate is a seeded real-board workbench with geometry and persistence assertions, matched captures of pinned code versions, and independent agent exploration/review. Native Playwright screenshot assertions would require its test runner rather than the existing Vitest runner. No additional dependency has been shown necessary for the first slice. Scenario-selection policy, release verification, runtime targets, and Chrome/Linux are accepted. The comparison-model choice is delegated; the workbench experience will be evaluated with a throwaway prototype before implementation.

## Throwaway prototype

Branch: `prototype/visual-sanity-workbench`. Run `mise exec -- bun run prototype:sanity` from this checkout. The launcher uses a fresh temporary SQLite database, synthetic secrets, a local Redis process, and the normal Homarr management shell. The route is disabled in production and requires the prototype launcher flag.

Open `http://localhost:3264/en/manage/tools/sanity-prototype?variant=A` and use the floating arrows to compare:

- **A — Compare first:** scenario sidebar, paired captures, dimensions, and review decision.
- **B — Run first:** mapped scenario results table, then selected evidence.
- **C — Review first:** a large capture, action stages, scenario filmstrip, and inspector.

The question is which arrangement makes it easiest to see what was checked and why a release is blocked. The comparison model uses the real recorded regression/hotfix captures from #7363; both images were captured at 1280×900. The UI explicitly identifies the known-good image as the hotfix capture rather than attributing it to an earlier release. Pixel differences use CSS difference blending for inspection only, without a threshold or automated verdict.

All runner actions and reviewer decisions are simulated in memory. The prototype does not run browser scenarios, validate persistence, approve a PR, or publish a release. The saved/observed dimension example is recorded evidence, not a new test result. Production components and the release gate remain unchanged.

Chrome interaction checks verified variant switching, preserved selected-case state, disabled appearance approval while any regression contract fails, simulated hotfix replay/review, the difference view, and a 390px layout without horizontal page overflow. No tests or Docker builds were added/run. The initial technical verdict is that the three views can express the same targeted evidence; the preferred experience remains for maintainer feedback. The prototype is not approved for promotion into production.
