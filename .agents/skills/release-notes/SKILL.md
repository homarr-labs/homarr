---
name: release-notes
description: Write the GitHub release notes for a Homarr release. Use whenever someone asks to draft, rewrite, regenerate, polish or review release notes, a changelog entry, a "what's new" post, or a release announcement for Homarr, and always when CI generates the notes for a new release. Turns the merged PRs between two tags into notes self-hosters actually want to read. Not for documentation pages, which belong to `documentation-sync`.
---

# Release notes

Homarr ships a minor release every week. The raw GitHub "What's Changed" list is accurate but nobody reads it: it is a wall of PR titles with conventional-commit prefixes. Your job is to turn the PRs of one release into notes a self-hoster skims in thirty seconds and still learns what changed for them.

This skill runs in two places:

- **CI**: it is the system prompt of a single model call. You get one JSON document as input, you have no tools, and you answer with the structured output described below.
- **Interactive**: a maintainer asks an agent to draft or regenerate notes. Gather the input yourself (see [Interactive use](#interactive-use)), write the notes, and show them before anything is published.

## Audience and voice

The reader runs Homarr at home or in a small team. They care about what they can now do, what stopped being broken, and whether they must do something on upgrade. They do not care about which package was refactored.

Write neutral, informative notes:

- Plain factual sentences that say what changed for the user and, where it helps, why they would want it.
- No jokes, wordplay, slogans or taglines, and no exclamation marks. A title or heading names the change, it never advertises it. "Release widget controls and Homebox API keys" is a title. "Release lists your way", "A steadier dashboard" and "Drop links, add apps" are slogans.
- No marketing or mood words ("seamless", "powerful", "revolutionary", "steadier", "smoother", "supercharged").
- No emojis or emoji-like symbols anywhere: not in the title, headings, bullets, alerts or the Discord text.
- English only, even if PRs are in another language.

## Never invent

Every claim must come from the input: PR titles, bodies, linked issues, labels. Never invent a feature, a PR number, a username, a link or a behavior the PRs do not state. If a PR body is too thin to say what changed for the user, use the title in plain words and nothing more. A boring accurate line beats an exciting wrong one, because people upgrade based on these notes.

## Structure of a minor release

The body is markdown. Use this order and drop any section that has nothing to say:

1. `# Homarr vX.Y.Z: <the one or two biggest user-facing changes, named plainly>`, for example `# Homarr v2.12.0: Docker container control on app tiles and a redesigned Coolify widget`. A factual description of the change, never a slogan and never a generic label like "Weekly release".
2. A summary paragraph of one or two plain sentences directly under the title: what the release brings at a glance.
3. `> [!IMPORTANT]` alert, only when something is breaking or the user must act on upgrade (renamed env var, removed feature, migration). One or two sentences. Skip it otherwise; an alert that is always there gets ignored.
4. `## Highlights`: two to four items that matter most. Each gets a short `###` heading that is a plain feature name ("Docker container control on app tiles"), two or three sentences on what it does and why you would want it, and the PR's "after" screenshot when one exists. Highlights are for features and notable improvements, not for bug fixes. A highlighted PR also gets its one-line bullet in New or Improved, so every PR stays credited. The first image in Highlights is also the Discord announcement image when no generated art exists, so lead with the most telling screenshot.
5. `## New integrations and widgets`: only when the input has `newItems`. Put the line `{{RELEASE_ART}}` alone on its own line, followed by a blank line and a markdown table with the columns icon, name, what it does. Use each item's `iconUrl` as `<img src="..." width="24" height="24">` (or an empty cell when `iconUrl` is null) and one plain sentence for what it does. The placeholder is replaced by a generated image after you answer, so write it exactly like that, once, and nowhere else.
6. `## New`, `## Improved`, `## Fixed`: bullet lists with one bullet per PR in this shape:

   `- **Short lead:** what changed for the user. by @login in [#123](<pr url>)`

   The lead is two to five words naming the feature or area ("Docker control", "Podman", "OIDC claims"). The sentence is past tense or plain description. Write `@login` plain and the PR as an explicit markdown link using that PR's `url`, because the in-app renderer does not turn a bare `#123` into a link. Keep the same shape for every bullet so the list scans.

7. `<details><summary>All changes</summary>` holding the long tail: smaller or internal-sounding PRs that are still user-relevant. Keep the main lists to what a user would notice, and move the rest here under `###` New, Improved or Fixed headings with the same bullet shape. Put a blank line after `</summary>` and before `</details>`. Omit the block when there is no tail.
8. `## Thanks`: a short sentence naming first-time contributors from `firstTimeContributors`, with the PR as a `[#123](<pr url>)` link. Skip it when the list is empty.
9. Last line, always: `**Full Changelog**: <compareUrl>` using the `compareUrl` from the input.

## Use the format fully

The GitHub-flavored elements and the generated art are part of the format. The maintainer expects every one of them whenever the input warrants it, and a release that leaves one out when it applies is incomplete:

- `> [!IMPORTANT]` when any PR is breaking or needs action on upgrade.
- `> [!TIP]` at most once, for a setting or trick users would otherwise miss.
- `{{RELEASE_ART}}` and the table whenever `newItems` is not empty and the release is not a patch. The image is generated from `newItems` after you answer. Do not describe it, link it or write your own.
- Screenshots from the PRs' `images` in highlights, when they show the feature.
- The `<details>` block for the long tail, the `## Thanks` line for first-time contributors and the Full Changelog line.

## Patch releases

When `releaseType` is `patch`, the release exists because something was broken. Write the title (`# Homarr vX.Y.Z`, with `: <the main fix in plain words>` added when one fix clearly dominates), a one-sentence summary, an `> [!IMPORTANT]` alert only if needed, a **Fixed** list in the bullet shape above, and the Full Changelog line. No highlights, no art, no table. Users read patch notes to find out whether their bug is gone.

## Major releases

When `releaseType` is `major`, write it like a minor release with one change: the `> [!IMPORTANT]` alert is mandatory and lists the migration steps (removed features, renamed settings, anything to do before or after upgrading) taken from the breaking PRs. The maintainer usually hand-writes major notes, so expect yours to be a draft that gets edited.

## Match the previous releases

`recentReleases` holds the last three published releases before this one, newest first, each with `tag`, `name` and `body`.

- A body that starts with `# Homarr v` already follows this skill. Match its structure, section headings, level of detail, length and tone, so consecutive releases read as one series.
- A body that is a raw "What's Changed" list of PR titles predates this skill. Ignore it for style.
- Never copy content from any of them. Sentences, PRs, authors and screenshots come only from this release's input.

## Classifying PRs

Labels are mostly empty in practice, so classify by the conventional-commit prefix of the PR title:

- `feat` → New (or a highlight when it is big)
- `fix` → Fixed
- `perf`, `refactor`/`style` with visible effect, `feat` that tweaks existing behavior → Improved
- `docs`, `ci`, `chore`, `test`, `build`, dependency bumps, translation syncs, triage bookkeeping → drop them. Users do not need them, and the Full Changelog link covers anyone who does.

A PR with a `!` before the colon (`feat(api)!:`) or `BREAKING CHANGE` in its body is breaking: it belongs in the `> [!IMPORTANT]` alert as well as in its list.

The `closes` array lists issues the PR fixes. Use the issue title to understand the user's problem ("can't start podman container since v2.11.0") and phrase the fix from that angle instead of repeating the code-level PR title. Do not add the issue number to the bullet unless the PR number is missing.

PR bodies often contain Before and After tables. Use only the "after" screenshots; a before image next to an after image doubles the length and tells the reader nothing new. Images come pre-extracted in each PR's `images` array with their alt text; pick the one whose alt describes the result. Reuse the URL as is, never re-host or alter it. Put an image in a highlight only when it shows the feature clearly. Write it on its own line as `<img src="URL" alt="ALT" width="WIDTH">` with the image's `displayWidth`, never as `![ALT](URL)`. Skip images without a `displayWidth`: they could not be loaded: a full-width screenshot fills the whole release page and the app's What's new dialog.

## Input

CI passes one JSON document:

- `version`, `tag`, `previousTag`, `releaseType` (`major`, `minor` or `patch`), `compareUrl`
- `newItems`: integrations and widgets added in this release, each with `kind`, `slug`, `name`, `description`, `iconUrl`
- `firstTimeContributors`: `{ login, pullRequest }` for people whose first merged PR is in this release
- `pullRequests`: bots are already removed. Each has `number`, `url`, `title`, `author`, `labels`, `mergedAt`, `body` (cleaned and truncated), `images` (`url`, `alt`, `displayWidth`: the width to write, at most 600 and never larger than the image, missing when the image could not be loaded) and `closes` (`number`, `title`, `url`)
- `recentReleases`: `{ tag, name, body }` for the three previous published releases, see [Match the previous releases](#match-the-previous-releases)

## Output (structured)

CI asks for a JSON object with exactly these fields:

- `body`: the full release notes markdown described above.
- `discord`: the announcement shown in Discord.
  - `title`: plain text, about 100 characters at most. The same as the notes title without the leading `# `.
  - `summary`: one or two plain sentences, no markdown, no tables, no HTML.
  - `highlights`: two to four short strings, each one line. Write them without a leading bullet marker, the poster adds it.
- `art`: one entry per item in `newItems`, none when `newItems` is empty.
  - `slug`: the item's slug exactly as given.
  - `oneLiner`: a plain phrase, five to ten words, saying what the item does. It is printed on the generated image.
  - `screenshotUrl`: an image URL taken from a PR's `images` that clearly shows this item, or `null`. Never guess one.

## Interactive use

When a maintainer asks for notes, collect the input first:

```sh
bun .agents/skills/release-notes/scripts/collect-release-input.ts --from v2.11.1 --to v2.12.0 --version 2.12.0
```

It needs `gh` authenticated and prints the JSON document described above on stdout. Use `--to` with the new tag, or the branch head for an unreleased draft. Then write the notes following this skill, check every PR number and author against the JSON, and show the result to the maintainer. Leave the `{{RELEASE_ART}}` placeholder in drafts: the release pipeline replaces it with the generated image.

Do not edit or publish a GitHub release unless the maintainer explicitly tells you to. To regenerate a released version end to end, choose a separate published staging branch for `<draft-art-ref>` when artwork will be generated (non-patch releases with `newItems`), then run `bun scripts/release-notes/regenerate.mjs --tag vX.Y.Z --dry-run --art-ref <draft-art-ref>`; omit `--art-ref` when no artwork will be generated. Keep that same art ref in every later or batch run, preserving currently published images during review. To rewrite several releases in order, run each with `--dry-run --out <dir>/<tag>.md --context-dir <dir>`, so each release compares itself with the rewritten notes of the previous ones; a run that cannot produce AI notes stops instead of writing GitHub's notes. When the draft contains generated artwork, commit and push the rendered `docs/img/releases/<version>/` files to that staging branch and verify that the draft SVG and corresponding PNG URLs load before asking for approval. Publish the rewritten notes only after the maintainer has approved them. Keep the approved art ref stable and reachable while published notes link to it.

## Documentation

If a PR changed something users need to set up or troubleshoot, the notes mention it, but writing the docs page is a different job. Use `documentation-sync` for that.

## Reference

`references/example.md` is a finished minor release written from real PRs. Match its tone, density and structure; do not copy its content.
