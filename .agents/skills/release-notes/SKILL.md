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

Write like the v2.0.0 notes: direct, casual, a little humor when it is earned. Be tighter than v2.0.0 because this is a weekly release, not a rewrite. Plain verbs, short sentences, no marketing words ("seamless", "powerful", "revolutionary"). English only, even if PRs are in another language.

## Never invent

Every claim must come from the input: PR titles, bodies, linked issues, labels. Never invent a feature, a PR number, a username, a link or a behavior the PRs do not state. If a PR body is too thin to say what changed for the user, use the title in plain words and nothing more. A boring accurate line beats an exciting wrong one, because people upgrade based on these notes.

## Structure of a minor release

The body is markdown. Use this order and drop any section that has nothing to say:

1. `# Homarr vX.Y.Z: <theme>`. The theme is two to five words naming the biggest user-facing thing ("Docker control from your tiles"), not "Weekly release".
2. `> [!IMPORTANT]` alert, only when something is breaking or the user must act on upgrade (renamed env var, removed feature, migration). One or two sentences. Skip it otherwise; an alert that is always there gets ignored.
3. `## Highlights`: two to four items that matter most. Each gets a short `###` heading, two or three sentences on what it does and why you would want it, and the PR's "after" screenshot when one exists. Use `> [!TIP]` once if there is a setting or trick users would otherwise miss. Highlights are for features and notable improvements, not for bug fixes. The first image in Highlights is also the Discord announcement image when no generated art exists, so lead with the most telling screenshot.
4. `## New integrations and widgets`: only when the input has `newItems`. Put the line `{{RELEASE_ART}}` alone on its own line, followed by a blank line and a markdown table with the columns icon, name, what it does. Use each item's `iconUrl` as `<img src="..." width="24" height="24">` (or an empty cell when `iconUrl` is null) and one plain sentence for what it does. The placeholder is replaced by a generated image after you answer, so write it exactly like that, once, and nowhere else.
5. `## New`, `## Improved`, `## Fixed`: bullet lists. One line per PR, past tense or plain description, ending with `by @author in [#123](<pr url>)`. Keep the same shape for every bullet so the list scans. Write `@author` plain and the PR as an explicit markdown link using that PR's `url`, because the in-app renderer does not turn a bare `#123` into a link.
6. `<details><summary>All changes</summary>` holding the long tail: smaller or internal-sounding PRs that are still user-relevant. Same bullet shape. Omit the block when there is no tail.
7. A short `## Thanks` naming first-time contributors from `firstTimeContributors`, with the PR as a `[#123](<pr url>)` link. One sentence. Skip it when the list is empty.
8. Last line, always: `**Full Changelog**: <compareUrl>` using the `compareUrl` from the input.

## Patch releases

When `releaseType` is `patch`, the release exists because something was broken. Write the title, an `> [!IMPORTANT]` alert only if needed, a **Fixed** list, and the Full Changelog line. No highlights, no art, no table, no theme. Users read patch notes to find out whether their bug is gone.

## Major releases

When `releaseType` is `major`, write it like a minor release with one change: the `> [!IMPORTANT]` alert is mandatory and lists the migration steps (removed features, renamed settings, anything to do before or after upgrading) taken from the breaking PRs. The maintainer usually hand-writes major notes, so expect yours to be a draft that gets edited.

## Classifying PRs

Labels are mostly empty in practice, so classify by the conventional-commit prefix of the PR title:

- `feat` → New (or a highlight when it is big)
- `fix` → Fixed
- `perf`, `refactor`/`style` with visible effect, `feat` that tweaks existing behavior → Improved
- `docs`, `ci`, `chore`, `test`, `build`, dependency bumps, translation syncs, triage bookkeeping → drop them. Users do not need them, and the Full Changelog link covers anyone who does.

A PR with a `!` before the colon (`feat(api)!:`) or `BREAKING CHANGE` in its body is breaking: it belongs in the `> [!IMPORTANT]` alert as well as in its list.

The `closes` array lists issues the PR fixes. Use the issue title to understand the user's problem ("can't start podman container since v2.11.0") and phrase the fix from that angle instead of repeating the code-level PR title. Do not add the issue number to the bullet unless the PR number is missing.

PR bodies often contain Before and After tables. Use only the "after" screenshots; a before image next to an after image doubles the length and tells the reader nothing new. Images come pre-extracted in each PR's `images` array with their alt text; pick the one whose alt describes the result. Reuse the URL as is, never re-host or alter it. Put an image in a highlight only when it shows the feature clearly.

## Input

CI passes one JSON document:

- `version`, `tag`, `previousTag`, `releaseType` (`major`, `minor` or `patch`), `compareUrl`
- `newItems`: integrations and widgets added in this release, each with `kind`, `slug`, `name`, `description`, `iconUrl`
- `firstTimeContributors`: `{ login, pullRequest }` for people whose first merged PR is in this release
- `pullRequests`: bots are already removed. Each has `number`, `url`, `title`, `author`, `labels`, `mergedAt`, `body` (cleaned and truncated), `images` (`url`, `alt`) and `closes` (`number`, `title`, `url`)

## Output (structured)

CI asks for a JSON object with exactly these fields:

- `body`: the full release notes markdown described above.
- `discord`: the announcement shown in Discord.
  - `title`: plain text, about 100 characters at most. Usually the same theme as the notes title.
  - `summary`: one or two plain sentences, no markdown, no tables, no HTML.
  - `highlights`: two to four short strings, each one line. Write them without a leading bullet marker, the poster adds it.
- `art`: one entry per item in `newItems`, none when `newItems` is empty.
  - `slug`: the item's slug exactly as given.
  - `oneLiner`: a short phrase, five to ten words, saying what the item does. It is printed on the generated image.
  - `screenshotUrl`: an image URL taken from a PR's `images` that clearly shows this item, or `null`. Never guess one.

## Interactive use

When a maintainer asks for notes, collect the input first:

```sh
bun .agents/skills/release-notes/scripts/collect-release-input.ts --from v2.11.1 --to v2.12.0 --version 2.12.0
```

It needs `gh` authenticated and prints the JSON document described above on stdout. Use `--to` with the new tag, or the branch head for an unreleased draft. Then write the notes following this skill, check every PR number and author against the JSON, and show the result to the maintainer.

Do not edit or publish a GitHub release unless the maintainer explicitly tells you to. To regenerate a released version end to end, point them at `bun scripts/release-notes/regenerate.mjs --tag vX.Y.Z --dry-run`.

## Documentation

If a PR changed something users need to set up or troubleshoot, the notes mention it, but writing the docs page is a different job. Use `documentation-sync` for that.

## Reference

`references/example.md` is a finished minor release written from real PRs. Match its tone, density and structure; do not copy its content.
