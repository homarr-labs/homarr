# Example: a minor release

This is v2.12.0, written from its real pull requests. Match its tone, density and structure: a plain title, a short summary, a bold lead on every bullet and a details block for the long tail. This release added no integrations or widgets, so it has no table. When `newItems` is not empty, add a section like this between Highlights and New, with the placeholder alone on the line above the table:

```markdown
## New integrations and widgets

{{RELEASE_ART}}

|                                             | Name | What it does                           |
| ------------------------------------------- | ---- | -------------------------------------- |
| <img src="ICON_URL" width="24" height="24"> | NAME | One plain sentence about what it does. |
```

When a PR is breaking or needs action on upgrade, put an alert directly under the summary and list the same PR in its section:

```markdown
> [!IMPORTANT]
> The `OLD_VARIABLE` environment variable was renamed to `NEW_VARIABLE`. Update your container configuration before upgrading.
```

Bots, docs, CI and triage PRs (#7489, #7491, #7492) are left out on purpose. #7428, #7463 and #7462 are highlighted and also get a one-line bullet in New. Nothing here is breaking or needs action on upgrade, so there is no `> [!IMPORTANT]` alert.

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
    "title": "Homarr v2.12.0: Docker container control on app tiles and a redesigned Coolify widget",
    "summary": "App tiles can now start and stop their Docker container and the Coolify widget was redesigned. Several regressions from v2.11 are fixed.",
    "highlights": [
      "Start and stop Docker containers from an app tile",
      "Redesigned Coolify widget with an overview of projects, resources and servers",
      "OpenMediaVault TOTP login, explicit container tracks and full URLs on bookmarks"
    ]
  },
  "art": []
}
```

## The release body

```markdown
# Homarr v2.12.0: Docker container control on app tiles and a redesigned Coolify widget

App tiles can now start and stop the Docker container they are linked to, and the Coolify widget was redesigned. This release also fixes several regressions from v2.11, including Podman containers that failed to start.

## Highlights

### Docker container control on app tiles

An app tile linked to a Docker container shows a play or stop button next to the status dot. The dot turns orange while the container changes state and red right after you stop it, and Homarr keeps pinging until the app answers again. Only admins see the button, and it is inactive in edit mode.

![Tile with a stop button next to the status dot](https://github.com/junkerderprovinz/homarr/raw/de37a249cd586ae4e5f9927b2dc72d2820835551/app-docker-toggle/tile-after.png)

> [!TIP]
> The new "Docker container" field sits right below "Choose app" in the tile settings. Picking an app links the container with the same name, or the subdomain of the app URL, when there is one.

### Coolify widget redesign

The compact card shows project, running resource and available server counts. Larger sizes list the resources that need attention, or your projects when everything is healthy, and the expanded view combines projects, issues and servers in one searchable overview. The widget keeps its last status when a project request fails instead of going blank.

![Coolify widget, healthy](https://github.com/user-attachments/assets/53e53b7c-583f-455d-99d8-6559cf2b9e67)

### OpenMediaVault TOTP, container tracks and bookmark options

- **OpenMediaVault:** integrations accept an optional TOTP secret, so two-factor login can stay enabled.
- **Container tracks:** Docker Hub, GHCR and Quay images can follow a non-version track such as `:nightly` and keep following it after a reload.
- **Bookmarks:** can show the full URL and a copy button. Both are off by default, so existing boards look the same.

## New

- **Docker control:** start and stop a linked Docker container from an app tile. by @junkerderprovinz in [#7428](https://github.com/homarr-labs/homarr/pull/7428)
- **Coolify widget:** redesigned layout that keeps its status when a project request fails. by @Rhiz3K in [#7463](https://github.com/homarr-labs/homarr/pull/7463)
- **OpenMediaVault, tracks, bookmarks:** TOTP secret, explicit container tracks, optional bookmark URL and copy button. by @ajnart in [#7462](https://github.com/homarr-labs/homarr/pull/7462)

## Fixed

- **Podman:** containers failed to start since v2.11.0 because the nginx workers ran as an unmapped user. by @ajnart in [#7487](https://github.com/homarr-labs/homarr/pull/7487)
- **Health checks:** containers using a `wget` health check reported `wget: not found` since the move to Debian. by @ajnart in [#7475](https://github.com/homarr-labs/homarr/pull/7475)
- **OIDC claims:** claims with dots in their name, such as `https://domain.com/roles`, now work for groups and name. by @ajnart in [#7482](https://github.com/homarr-labs/homarr/pull/7482)
- **Pi-hole v6:** custom widgets opened a new session on every request and used up the API seats. They now reuse one session. by @Epoustouflant in [#7481](https://github.com/homarr-labs/homarr/pull/7481)

<details>
<summary>All changes</summary>

### Improved

- **Dropped URLs:** dropping a URL on a board now picks a matching icon from the icon library before falling back to the site's own favicon. by @mawcs in [#7392](https://github.com/homarr-labs/homarr/pull/7392)

### Fixed

- **Board layout:** the board wobbled at some window sizes because the scrollbar kept resizing the layout. by @ajnart in [#7485](https://github.com/homarr-labs/homarr/pull/7485)
- **Releases widget:** widgets with many repositories hit the URL length limit and showed providers as unresponsive. by @ajnart in [#7425](https://github.com/homarr-labs/homarr/pull/7425)
- **Jackett:** the connection test stopped at "All indexers". Each indexer is now tested on its own and failures are named. by @ajnart in [#7484](https://github.com/homarr-labs/homarr/pull/7484)
- **Frigate:** the connection test now says which authentication step failed. by @ajnart in [#7486](https://github.com/homarr-labs/homarr/pull/7486)

</details>

## Thanks

Welcome to @Epoustouflant, whose first contribution landed in [#7481](https://github.com/homarr-labs/homarr/pull/7481).

**Full Changelog**: https://github.com/homarr-labs/homarr/compare/v2.11.1...v2.12.0
```

## A patch release, for shape

```markdown
# Homarr vX.Y.Z: <the main fix in plain words>

One sentence on what was broken and that it is fixed.

> [!IMPORTANT]
> Only when users must act or are affected by something specific.

## Fixed

- **Short lead:** <what was broken, in the user's words>. by @author in [#123](<pr url>)

**Full Changelog**: <compareUrl>
```
