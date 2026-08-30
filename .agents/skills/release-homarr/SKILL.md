---
name: release-homarr
description: Prepare, verify, publish, or recover a Homarr release. Use when changing the root version, merging dev into main, running Semantic Release, publishing GitHub or GHCR artifacts, manually redeploying an existing version, checking release CI, or coordinating a major release such as v2.
---

# Release Homarr

Treat the Git tag, GitHub release, multi-platform GHCR image, and announcement as separate gates. Verify each one against the same commit and version.

## Release paths

- A push to `dev` builds the mutable `dev` image. It does not create a Git tag or GitHub release.
- A push to `main` runs Semantic Release. Merge `dev` into `main` only when the release should start.
- A manual dispatch redeploys the latest existing tag reachable from the selected `main` or `beta` ref. It does not calculate or create a new release.
- A `beta` push creates a prerelease through the configured Semantic Release channel.

## Prepare a major release

1. Set the root `package.json` version to the intended major, such as `2.0.0`. Do not change private workspace package versions unless they are published independently.
2. Ensure commits since the latest production tag contain a conventional breaking signal: `type!:` or a `BREAKING CHANGE:` footer. Package metadata alone does not make Semantic Release choose a major.
3. Merge the release work into `dev` and let its CI and preview image complete. This is a release candidate, not a production release.
4. Verify the final `dev` head and open the deliberate `dev` to `main` release PR. Preserve a breaking signal when squashing or rebasing stacked branches.
5. Merge that PR only at the planned announcement time. The `main` push starts the production release workflow.

## Verify publication

For the exact `main` release commit, verify:

1. Semantic Release created the expected `vX.Y.Z` tag and draft GitHub release.
2. AMD64 and ARM64 builds succeeded.
3. The versioned and channel GHCR tags resolve to one multi-platform manifest containing both architectures.
4. Release assets were extracted from the same release ref.
5. The GitHub release became public only after publication completed.
6. The configured announcement ran, or publish the planned human announcement after every prior gate passes.

Do not rerun an older workflow without comparing its commit and computed version to the intended release. A stale rerun can republish an older reachable tag.

## Recovery

Rerun only the failed jobs from the exact release workflow when the release commit and version are correct. Use manual dispatch only to rebuild an existing release intentionally; it is not a substitute for a missing Semantic Release run.
