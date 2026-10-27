# Board sanity

Use this workflow for board layout/editing, shared rendering dependencies, and release candidates. The workbench lives outside management at `/debug/board/sanity` (with `ENABLE_BOARD_DEBUG=true`); it imports evidence from real disposable boards. Snapshot replay helps inspect a captured state; it does not prove editing or persistence.

## Contribution loop

1. **Preserve behavior.** Write the intended improvement and the existing guarantees before editing. Saved dimensions, neighbor placement, scrolling, and save/reload are contracts. A proposed change to a contract needs the maintainer's decision.
2. **Select.** Run `bun run sanity:select` with the PR base and head refs. Its checked-in mappings select the affected scenarios. For each unmapped changed path, add a concrete coverage decision bound to its candidate file blob in `scripts/sanity/coverage-decisions.json`, naming additional scenarios or explaining why none apply. Existing mapped scenarios remain required. Finish when no changed path is unaccounted for.
3. **Explore.** Load `agent-browser skills get core` and inspect the unchanged and changed feature at matching viewports, theme, and synthetic data. Turn a newly discovered behavior contract into a durable scenario in the existing sanity runner. Keep the representative board fixtures small; isolated scenarios run in parallel.
4. **Run.** Use `bun run sanity:run --config <file> --output <report.json>` against pinned, disposable before/after instances. Reuse existing images or local source instances; the runner does not build images. Seed authentication and prerequisite data, then exercise the changed behavior through the real editor. Changes under `packages/auth/**` always require a matching source-bound coverage decision. Validate changed sign-in behavior separately and record that evidence in the decision: seeded sessions only prove board access, not the login flow. Finish only when every selected scenario has complete captures and assertions. Preserve failed and blocked evidence.
5. **Review independently.** Give a separate reviewer the intended change, preserved contracts, source identities, coverage decisions, and complete report. They inspect before/after images in the workbench and confirm that every selected scenario ran. An independent agent may accept explained appearance changes; changes to behavior guarantees need a maintainer decision. The implementing agent cannot approve its own replacement baseline. Publish the evidence before approving the PR.

A different source head, image, fixture, or browser environment invalidates the associated evidence. Rerun against the new identity. Keep failing contracts visible; changing a baseline, dropping a selected scenario, or adding a broad coverage exemption is a product/coverage decision requiring review, not a way to make a run pass.

Before accepting retained evidence, run `bun scripts/sanity/expected-run.mts --output expected-run.json` from the intended harness checkout with its installed Chromium. Pass that independently generated identity to `parseSanityReport(reportText, expectedRun)` and verify the source, image, mode, and selected scenarios as CI does. Never derive the expected identity from the report itself. The workbench can open historical reports for inspection; opening one does not establish that it matches a new run.

## Runner configuration

Configuration stays outside the repository when it contains local paths:

```json
{
  "mode": "pr",
  "disposable": true,
  "base": {
    "label": "PR base",
    "sourceRef": "<base SHA>",
    "url": "http://127.0.0.1:3000",
    "databasePath": "/tmp/homarr-before/db.sqlite"
  },
  "candidate": {
    "label": "PR head",
    "sourceRef": "<head SHA>",
    "url": "http://127.0.0.1:3001",
    "databasePath": "/tmp/homarr-after/db.sqlite"
  },
  "coverageDecisions": []
}
```

The two instances need separate migrated databases. `disposable: true` authorizes synthetic fixture writes only to those instances. Keep real users, sessions, and integrations out of them. For an image target, replace `url` and `databasePath` with `image`, using an already-pulled immutable reference. Include the checked-in coverage decisions in the run config as well as the selector. Release mode requires images and verified source provenance for both sides.

## CI and release evidence

The sanity harness uses the triggering workflow commit; the tested images retain their separately verified source SHAs. For a manual CI run, dispatch `ci.yml` with `--ref <candidate branch>`. Its optional `ref` input must resolve to the dispatched commit; publishing still requires that input. CI never checks out a different ref supplied inside a default-branch run.

The existing Fast gate remains the source-validation gate. CI records targeted coverage and runs browser scenarios when the existing amd64 preview is available. Fork/draft PRs without a preview have **pending browser evidence**, not passing assertions. Resolve missing exact-source images or run a local pair and obtain independent review before approval.

Release publication depends on the selected checks against the already-built candidate digest. The comparison starts at the last published ancestor release carrying `board-sanity-baseline.json`, so every change since that baseline is included. A reviewed immutable `scripts/sanity/release-baseline.json` anchors the first adoption; the runner still verifies its actual image provenance. Missing provenance, an unmapped path, missing execution, or a failing contract blocks publication. Maintainer exceptions must identify the exact source/image, failed guarantee, and accepted risk; the tools do not silently grant an exception.

CI preserves the selection, report, and failure log. Published releases retain the selection, complete report when scenarios ran, and the next baseline record. A successful deterministic job leaves visual review **pending**. Independent visual acceptance is enforced through the review workflow and repository approval requirements; it is not a trusted machine attestation and cannot be supplied by editing report JSON.

Use Chromium on Linux. Targets are 60 seconds for warm local checks and 3 minutes for selected CI execution after the app/image is ready. Report startup separately. A timing overrun never removes required checks.
