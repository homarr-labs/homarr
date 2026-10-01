# Documentation analytics

The docs site records pageviews and named events with PostHog through `hog.homarr.dev`. Events follow the
`Object Performed` naming convention. The implementation lives in `src/lib/analytics.ts` (initialization and `track()`)
and `src/components/analytics.tsx` (delegated link and copy listeners).

## Common properties

Every event, including `$pageview`, carries:

| Property       | Description                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------- |
| `site`         | Always `homarr-docs`.                                                                        |
| `surface`      | `home`, `docs`, `api_reference`, `blog`, `workshop`, or `about`, derived from the pathname.  |
| `verification` | `true` on localhost and for any URL with `?analytics_test`; exclude from production reports. |
| `source_path`  | Pathname of the page the event was triggered from.                                           |

Tracked URL query strings and fragments are removed in `before_send`. Autocapture, page-leave events, dead clicks, heatmaps,
session recording, surveys, and exception capture stay disabled; `$pageview` and web vitals remain enabled. Do not capture
Workshop form contents or API-key inputs.

## Events

| Event                       | Properties                                                   | Trigger                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link Clicked`              | `destination`, `external`, `link_kind`, `link_text`, `label` | Any left or middle click on an `a[href]` outside Carbon placements. `link_kind` is `nav`, `sidebar`, `toc`, `footer`, `cta`, or `content`.                                                    |
| `Demo Opened`               | `destination`, `link_text`, `label`                          | Link to `demo.homarr.dev`.                                                                                                                                                                    |
| `Installation Opened`       | `destination`, `link_text`, `label`                          | Link with `data-attr="Install button"`.                                                                                                                                                       |
| `Launch Menu Opened`        | —                                                            | Home hero `Launch` menu opened.                                                                                                                                                               |
| `Sidebar Toggled`           | `folder`, `expanded`                                         | Docs sidebar folder expanded or collapsed.                                                                                                                                                    |
| `Search Opened`             | `trigger`                                                    | Search dialog opened; `trigger` is `keyboard` for Cmd/Ctrl+K within one second of opening, otherwise `click`.                                                                                 |
| `Search Performed`          | `query`, `result_count`                                      | Settled search query with at least one result, 900 ms after the last keystroke.                                                                                                               |
| `Search No Results`         | `query`                                                      | Settled search query with zero results.                                                                                                                                                       |
| `Search Result Clicked`     | `query`, `result_index`, `result_type`, `destination`        | A result in the search dialog was selected.                                                                                                                                                   |
| `Tab Switched`              | `tab`                                                        | MDX tab selected by click or keyboard focus.                                                                                                                                                  |
| `Directory Filtered`        | `label`, `query`, `result_count`                             | Widget or integration directory filter settled, 700 ms after the last keystroke.                                                                                                              |
| `Code Copied`               | `code_kind`, `code_language`                                 | Copy button clicked. `code_kind` is `docs_code`, `markdown` (page actions), `docker_snippet`, or `custom_widget`.                                                                             |
| `Docker Key Refreshed`      | —                                                            | Installation guide encryption key regenerated.                                                                                                                                                |
| `Ask AI Opened`             | `trigger`                                                    | Ask AI mascot launched the Kapa dialog.                                                                                                                                                       |
| `Workshop Item Opened`      | `item_id`, `item_type`                                       | Workshop submission detail successfully loaded.                                                                                                                                               |
| `Workshop Vote Cast`        | `item_id`, `direction`                                       | Vote request reconciled; `direction` is `upvote`, `downvote`, or `removed` when the click cleared the vote.                                                                                   |
| `Workshop Comment Posted`   | `item_id`                                                    | Comment successfully created on a submission.                                                                                                                                                 |
| `Workshop Submit Started`   | —                                                            | Submission dialog opened.                                                                                                                                                                     |
| `Workshop Submit Completed` | `item_type`                                                  | Submission created and listings refreshed.                                                                                                                                                    |
| `Workshop Sign In Clicked`  | —                                                            | Sign in with GitHub button clicked.                                                                                                                                                           |
| `Workshop Item Downloaded`  | `item_id`, `item_type`, `method`                             | Submission content taken from the detail page: `method` is `file` (Download widget JSON) or `clipboard` (Copy JSON / Copy CSS). Clipboard is the only acquisition path for `customCss` items. |

## Legacy names

The first iteration of docs analytics used three snake_case events. They are replaced one-to-one:

| Legacy                | Current               |
| --------------------- | --------------------- |
| `link_clicked`        | `Link Clicked`        |
| `demo_opened`         | `Demo Opened`         |
| `installation_opened` | `Installation Opened` |

## Verification

Run the docs locally and append `?analytics_test` to any page, then confirm events arrive in PostHog with
`verification=true` and are excluded from production insights. Localhost traffic is marked the same way.
