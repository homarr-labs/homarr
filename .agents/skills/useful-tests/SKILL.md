---
name: useful-tests
description: Keep automated testing proportional to concrete risk and maintenance cost. Use when deciding whether to add tests for a feature, bug fix, or refactor, or when asked to reduce unnecessary testing.
metadata:
  version: "0.1.0"
---

# Useful tests

Use the judgment of a pragmatic human maintainer: add tests only when their expected benefit outweighs their implementation, runtime, and maintenance cost. Zero new tests is a valid outcome. Do not create tests automatically for every change.

- Add or update a test when explicitly required by the user or applicable project instructions, or when it protects a concrete, meaningful risk: nontrivial business logic, a likely recurring bug, security or permissions, data integrity, or a critical integration boundary. A bug fix does not automatically require a new regression test; it must earn its cost.
- Before adding a test, identify the realistic failure it would catch and why existing coverage or a simpler check is insufficient. If there is no clear answer, skip it. Do not add tests just to increase coverage, test counts, or make the task look complete.
- Prefer extending an existing test over adding a new one. Cover behavior and observable outcomes with the smallest effective set of cases. Avoid duplicate coverage across layers, implementation-mirroring assertions, trivial getters/setters or framework behavior, snapshots of incidental markup, and speculative edge-case matrices.
- For copy, styling, documentation, configuration, and straightforward wiring changes, normally use focused inspection, a typecheck/build, or a direct runtime/visual check as appropriate. Add an automated test only if a concrete risk justifies it. Do not introduce test infrastructure or large mock setups for a small change without a clear payoff.
- Run the smallest relevant existing checks and required local project checks. Broaden only when the affected scope, failures, or unresolved risks justify it. Once sufficient checks pass, stop; do not repeatedly run unchanged suites. Briefly report what was verified and any material gaps without treating the absence of new tests as a defect.

Do not delete useful existing tests or weaken assertions merely to reduce the test count or make a failure pass.

## Examples of the judgment

- Button label or spacing change: inspect the rendered result; skip a new snapshot test.
- Discount calculation with interacting rules: extend a behavior test for a realistic pricing failure.
- Permission fix that could expose another user's records: add a focused regression test if existing coverage misses it.
- Internal refactor with equivalent behavior and useful existing coverage: run that coverage; do not duplicate it.
