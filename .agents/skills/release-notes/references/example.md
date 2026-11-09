# Example: a minor release

This is v2.12.0, written from its real pull requests. Match its tone, density and structure. This release added no integrations or widgets, so it has no table. When `newItems` is not empty, add a table like this between Highlights and New, with the placeholder alone on the line above it:

```markdown
## New integrations and widgets

{{RELEASE_ART}}

|                                             | Name | What it does                           |
| ------------------------------------------- | ---- | -------------------------------------- |
| <img src="ICON_URL" width="24" height="24"> | NAME | One plain sentence about what it does. |
```

Bots, docs, CI and triage PRs (#7489, #7491, #7492) are left out on purpose. #7462 bundles four changes, so it appears as one highlight plus a line in New. Nothing here is breaking or needs action on upgrade, so there is no `> [!IMPORTANT]` alert.

## Input facts the example relies on

- `releaseType`: `minor`, `previousTag`: `v2.11.1`, `compareUrl`: `https://github.com/homarr-labs/homarr/compare/v2.11.1...v2.12.0`
- `newItems`: empty
- `firstTimeContributors`: `Epoustouflant` (#7481)
- #7487 closes issue #7469 "can't start podman container since last update (v2.11.0)"
- #7482 closes issue #7467 "AUTH_OIDC_GROUPS_ATTRIBUTE with namespaced claim"

## Structured output

```json
{
  "body": "<the markdown below>",
  "discord": {
    "title": "Homarr v2.12.0: Docker control from your tiles",
    "summary": "App tiles can now start and stop their Docker container, the Coolify widget got a full redesign, and a handful of v2.11 regressions are fixed.",
    "highlights": [
      "Start and stop Docker containers straight from an app tile",
      "Redesigned Coolify widget with an overview of projects, resources and servers",
      "OpenMediaVault TOTP login, explicit container tracks and full URLs on bookmarks"
    ]
  },
  "art": []
}
```

## The release body

```markdown
# Homarr v2.12.0: Docker control from your tiles

## Highlights

### Start and stop containers from an app tile

Link an app tile to its Docker container and it gets a small play/stop button next to the status dot. The dot turns orange while the container changes state, red right after you stop it, and Homarr keeps pinging until the app answers again. Only admins see the button, and it stays inactive in edit mode.

![Tile with a stop button next to the status dot](https://github.com/junkerderprovinz/homarr/raw/de37a249cd586ae4e5f9927b2dc72d2820835551/app-docker-toggle/tile-after.png)

> [!TIP]
> The new "Docker container" field sits right below "Choose app" in the tile settings. Picking an app links the container with the same name, or the subdomain of the app URL, when there is one.

### A Coolify widget that tells you what is wrong

The compact card now shows project, running resource and available server counts. Bigger sizes list the resources that need attention, or your projects when everything is healthy, and the expanded view puts projects, issues and servers in one searchable overview. The widget also keeps its last status when a project request fails instead of going blank.

![Coolify widget, healthy](https://github.com/user-attachments/assets/53e53b7c-583f-455d-99d8-6559cf2b9e67)

### Smaller upgrades that were long requested

- **OpenMediaVault** integrations accept an optional TOTP secret, so you can keep two-factor login on.
- **Container tracks**: Docker Hub, GHCR and Quay images can follow a non-version track such as `:nightly` and keep following it after a reload.
- **Bookmarks** can show the full URL and a copy button. Both are off by default, so existing boards look the same.

## New

- Start and stop a linked Docker container from an app tile by @junkerderprovinz in [#7428](https://github.com/homarr-labs/homarr/pull/7428)
- Redesigned Coolify widget that keeps its status when a project errors by @Rhiz3K in [#7463](https://github.com/homarr-labs/homarr/pull/7463)
- OpenMediaVault TOTP, explicit container tracks, optional bookmark URLs and copy button by @ajnart in [#7462](https://github.com/homarr-labs/homarr/pull/7462)

## Fixed

- Podman containers failing to start since v2.11.0 because nginx workers ran as an unmapped user by @ajnart in [#7487](https://github.com/homarr-labs/homarr/pull/7487)
- Containers using a `wget` health check reporting `wget: not found` since the move to Debian by @ajnart in [#7475](https://github.com/homarr-labs/homarr/pull/7475)
- OIDC claims with dots in their name, like `https://domain.com/roles`, now work for groups and name by @ajnart in [#7482](https://github.com/homarr-labs/homarr/pull/7482)
- Pi-hole v6 custom widgets opened a new session on every request and used up all API seats; they now reuse one by @Epoustouflant in [#7481](https://github.com/homarr-labs/homarr/pull/7481)
- Board wobbling at some window sizes because the scrollbar kept resizing the layout by @ajnart in [#7485](https://github.com/homarr-labs/homarr/pull/7485)
- Releases widgets with many repositories hitting the URL length limit and showing providers as unresponsive by @ajnart in [#7425](https://github.com/homarr-labs/homarr/pull/7425)
- Jackett test connection stopping at "All indexers"; each indexer is now tested on its own and failures are named by @ajnart in [#7484](https://github.com/homarr-labs/homarr/pull/7484)
- Frigate test connection now says which authentication step failed by @ajnart in [#7486](https://github.com/homarr-labs/homarr/pull/7486)
- Dropping a URL on a board now picks a matching icon from the icon library before falling back to the site's own favicon by @mawcs in [#7392](https://github.com/homarr-labs/homarr/pull/7392)

## Thanks

Welcome to @Epoustouflant, whose first contribution landed in [#7481](https://github.com/homarr-labs/homarr/pull/7481).

**Full Changelog**: https://github.com/homarr-labs/homarr/compare/v2.11.1...v2.12.0
```

## A patch release, for shape

```markdown
# Homarr vX.Y.Z

> [!IMPORTANT]
> Only when users must act or are affected by something specific.

## Fixed

- <what was broken, in the user's words> by @author in [#123](<pr url>)

**Full Changelog**: <compareUrl>
```
