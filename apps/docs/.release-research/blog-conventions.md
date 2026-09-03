# Homarr release-blog conventions and precedents

## Scope and baseline

This audit covers every file currently published through `apps/docs/blog`: ten posts dated from 2022-06-22 through 2025-08-02, plus the blog authors map, Docusaurus configuration, docs package scripts, and image styling. The audited blog/config files have no diff between this checkout and `origin/release/v2` (`ac62e5bfd6731651b75345b8bb6a07882fad8daa`).

The repository contains four direct release announcements, one open-beta announcement, one 1.0 migration guide, and four general product/docs posts. There is no existing 2.0 post and no post after August 2025.

## Best precedents for the 2.0 post

Use a deliberate combination rather than copying one post wholesale:

1. **0.14 is the strongest feature-story precedent.** It opens with a user-facing hook, gives a concise highlights list, places `<!-- truncate -->` before the long form, separates breaking changes from feature detail, and then gives each major feature its own screenshot-backed subsection. Source: `apps/docs/blog/2023/11-10-authentication/index.mdx:11-86`.
2. **0.11 is the strongest motion-media precedent.** It pairs a high-level change list with a detailed drag-and-drop section, an embedded MP4, a local WebP, a shared-doc GIF, and a closing CTA. Source: `apps/docs/blog/2023/01-11-version0.11/index.mdx:11-67`.
3. **1.0 is the strongest major-release and technical-safety precedent.** It explains why the release is exceptional, gives an architectural “Changes at a glance” section, emphasizes backup/breaking-change precautions, and inventories operational changes. It is not a visual precedent because it contains no media. Source: `apps/docs/blog/2024/09-23-version-1.0/index.mdx:6-86`.
4. **0.12 is a useful secondary precedent for a broad feature catalog.** It uses one short section per improvement, includes both screenshots and a GIF, discusses caching/performance in plain language, and closes with a full-changelog link. Its loose structure and unsupported superlatives should not be copied. Source: `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:11-75`.

Recommended synthesis: 0.14’s narrative and visual cadence + 0.11’s motion treatment + 1.0’s technical honesty and release guidance + 0.12’s changelog CTA.

## Complete chronology

Dates below are encoded in the post directory names. No post declares an explicit `date` field.

| Path date | Post | Release role | Front matter | Media and structural notes |
| --- | --- | --- | --- | --- |
| 2022-06-22 | `documentation` | General announcement | Explicit `slug`, `title`, two authors, tags | Intro, truncate marker, two explanatory sections, TL;DR; no media. Source: `apps/docs/blog/2022/06-22-documentation/index.mdx:1-35`. |
| 2022-08-28 | `translation` | Product/community announcement | Explicit `slug`, `title`, two authors, tags | Local WebP before truncate; H3 sections rather than H2. Source: `apps/docs/blog/2022/08-28-translation/index.mdx:1-20`. |
| 2023-01-11 | `version0.11` | Release announcement | Explicit `title`, four authors, release tags | Opening summary list; truncate; detailed H2s; remote MP4, shared docs images/GIF, local WebP; CTA. Source: `apps/docs/blog/2023/01-11-version0.11/index.mdx:1-67`. |
| 2023-04-16 | `version0.12-more-widgets` | Release announcement | Explicit `title`, four authors, release tags | Starts directly with H2 feature sections; truncate after the first two sections; remote screenshots and GIF; full changelog. Source: `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:1-75`. |
| 2023-11-10 | `authentication` | Release announcement (0.14) | Explicit `title`, four authors, release tags | Hook, highlights, truncate, breaking changes, screenshot-led H3 details; eight remote images. Source: `apps/docs/blog/2023/11-10-authentication/index.mdx:1-86`. |
| 2023-12-22 | `updated-documentation` | General announcement | Explicit `title`, one author, tags | Two-line intro, truncate, short highlight list. Source: `apps/docs/blog/2023/12-22-updated-documentation/index.mdx:1-21`. |
| 2024-09-23 | `version-1.0` | Major-release announcement | Author only; H1 supplies title | Major-release framing, compact technical overview, truncate, warning admonition, long breaking-change inventory; no media. Source: `apps/docs/blog/2024/09-23-version-1.0/index.mdx:1-86`. |
| 2024-12-17 | `open-beta-1.0` | Open-beta announcement | Author only; H1 supplies title | Short feedback invitation, truncate, Docker Compose code block, cross-link to 1.0 breaking changes. Source: `apps/docs/blog/2024/12-17-open-beta-1.0/index.mdx:1-39`. |
| 2025-01-19 | `migration-guide-1.0` | Migration guide | Author only; H1 supplies title | Prerequisites, truncate, local screenshot, warning admonition, ordered migration narrative. Source: `apps/docs/blog/2025/01-19-migration-guide-1.0/index.mdx:1-41`. |
| 2025-08-02 | `using-argus` | Version-linked how-to | Author only; H1 supplies title | Product/version context, truncate, two local screenshots, H2 task sections, numbered steps. Source: `apps/docs/blog/2025/08-02-using-argus/index.mdx:1-67`. |

The checked-in path chronology is unusual around 1.0: the `version-1.0` post is dated September 2024, the “Open Beta 1.0” post December 2024, and the migration guide January 2025. Treat those as historical path dates, not a release-sequencing model. A 2.0 post should use its actual intended publication date.

There are no standalone blog posts for 0.13, 0.15, or later 1.x releases in this corpus. The Argus article only references the addition of `/api/info` in `v1.32.0`. Source: `apps/docs/blog/2025/08-02-using-argus/index.mdx:6-9`.

## Exact Docusaurus conventions

### Location, filename, date, and URL

- Posts live at `apps/docs/blog/YYYY/MM-DD-descriptive-slug/index.mdx`.
- The date is inferred from the directory name; none of the ten posts has a `date:` field.
- Only the two 2022 posts override `slug`; every later post relies on the dated directory slug. Sources: `apps/docs/blog/2022/06-22-documentation/index.mdx:1-8`, `apps/docs/blog/2022/08-28-translation/index.mdx:1-8`, and the front matter of all later posts.
- The default blog route is `/blog` because the classic preset enables `blog` without overriding `routeBasePath`. It is linked in both the navbar and footer. Sources: `apps/docs/docusaurus.config.ts:62-80`, `apps/docs/docusaurus.config.ts:114-132`, `apps/docs/docusaurus.config.ts:239-244`.
- The dated route shape is demonstrated by the checked-in link `/blog/2024/09/23/version-1.0`. Source: `apps/docs/blog/2024/12-17-open-beta-1.0/index.mdx:37-39`.

Recommended target path:

```text
apps/docs/blog/YYYY/MM-DD-homarr-2.0/index.mdx
apps/docs/blog/YYYY/MM-DD-homarr-2.0/img/<descriptive-asset-name>.<ext>
```

Do not add an explicit `slug` unless a route different from the dated directory slug is required.

### Front matter

Authors are the only universal front-matter field. They are always expressed as a YAML list and resolve through `apps/docs/blog/authors.yml`; Docusaurus is explicitly configured with `authorsMapPath: "authors.yml"`. Sources: `apps/docs/docusaurus.config.ts:74-80`, `apps/docs/blog/authors.yml:1-37`.

There are two historical styles:

- **2022–2023:** explicit `title`, `authors`, and `tags`, with no body H1. This includes all three visually rich release posts (0.11, 0.12, 0.14). Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:1-11`, `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:1-11`, `apps/docs/blog/2023/11-10-authentication/index.mdx:1-11`.
- **2024–2025:** only `authors` in front matter, followed by a body H1. Sources: `apps/docs/blog/2024/09-23-version-1.0/index.mdx:1-7`, `apps/docs/blog/2024/12-17-open-beta-1.0/index.mdx:1-8`, `apps/docs/blog/2025/01-19-migration-guide-1.0/index.mdx:1-8`, `apps/docs/blog/2025/08-02-using-argus/index.mdx:1-8`.

No existing post uses `description`, `image`, `draft`, or explicit `date` front matter.

For a large discoverable release article, the best-established release-specific form is:

```yaml
---
title: "<release title>"
authors:
  - <key from authors.yml>
tags: [homarr, update, version, <feature tags>]
---
```

Use only existing author keys (`manuel-rw`, `ajnart`, `meierschlumpf`, `tagashi`, `walkx`) unless the authors map is intentionally updated. Do not also add a body H1 when `title` is present; none of the explicit-title posts duplicates it.

### Excerpt boundary and headings

- Every one of the ten posts contains exactly one `<!-- truncate -->` marker. This controls the blog-list preview.
- The strongest release posts place the marker after a hook and overview/highlights, before the detailed tour: 0.11 at line 23, 0.14 at line 26, and 1.0 at line 31.
- 0.12 is the exception: it places the marker after two feature sections at line 25.
- Detail normally uses H2. The 0.14 post uses an H2 for major groupings and H3 for individual screenshot-backed features. Sources: `apps/docs/blog/2023/11-10-authentication/index.mdx:15-39`, `apps/docs/blog/2023/11-10-authentication/index.mdx:43-72`.
- The site table of contents exposes H2 through H4. Source: `apps/docs/docusaurus.config.ts:293-296`.

For 2.0, place the truncate marker after the opening promise, hero media, and “highlights at a glance,” but before the first deep-dive section. This makes the listing persuasive without putting the entire article on the index page.

### Site behavior that affects the post

- Blog reading time is enabled. Source: `apps/docs/docusaurus.config.ts:74-79`.
- The docs manifest requests Docusaurus `^3.10.1`, and the checked-in lockfile resolves `3.10.1`; the app includes MDX/React support. Sources: `apps/docs/package.json:23-34`, `apps/docs/package.json:64-74`, `pnpm-lock.yaml:806-819`, `pnpm-lock.yaml:4523-4527`.
- Broken links, broken anchors, duplicate routes, and broken Markdown links are configured to throw. Sources: `apps/docs/docusaurus.config.ts:35-37`, `apps/docs/docusaurus.config.ts:52-57`.
- Blog URLs are included in the sitemap with priority `0.3` and `changefreq: "never"`. Source: `apps/docs/docusaurus.config.ts:84-105`.
- Blog author/tag/archive utility routes are excluded from DocSearch crawling, but article URLs are not. Source: `apps/docs/docsearch.config.js:11-21`.
- The site defaults to dark mode while respecting the reader’s system preference. Source: `apps/docs/docusaurus.config.ts:272-275`.

## Tone and editorial pattern

The recurring house voice is:

- **Collective and direct:** “we” for the project/team and “you” for the reader. This is consistent from the 0.11 opening through the 1.0 and beta announcements. Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:11-12`, `apps/docs/blog/2024/09-23-version-1.0/index.mdx:7-14`, `apps/docs/blog/2024/12-17-open-beta-1.0/index.mdx:8-11`.
- **Excited but concrete:** a short celebratory hook is immediately followed by user-visible outcomes or a highlights list. Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:11-21`, `apps/docs/blog/2023/11-10-authentication/index.mdx:11-24`.
- **Technical terms explained through consequences:** the 1.0 article explains asynchronous integrations in terms of waiting, reloads, and repeated per-user requests before naming the scaling improvement. Source: `apps/docs/blog/2024/09-23-version-1.0/index.mdx:16-29`.
- **Before/after framing:** feature sections often start with the old limitation and then state the new behavior. Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:25-28`, `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:51-60`, `apps/docs/blog/2023/11-10-authentication/index.mdx:65-76`.
- **Honest about migration and limits:** major changes get explicit breaking-change sections, warnings, backup advice, and caveats about unfinished work. Sources: `apps/docs/blog/2024/09-23-version-1.0/index.mdx:10-14`, `apps/docs/blog/2024/09-23-version-1.0/index.mdx:33-38`, `apps/docs/blog/2023/11-10-authentication/index.mdx:28-35`, `apps/docs/blog/2023/11-10-authentication/index.mdx:78-84`.
- **Skimmable:** short paragraphs, bold labels in overview bullets, and one visible idea per subsection.

For the 2.0 article, retain the excitement but improve on older copy:

- Prefer measured claims over unsupported superlatives. A performance percentage should say what was measured, in which browser/workload, and whether it refers to memory, load time, or requests.
- Explain architecture through reader impact: for example, describe parallel data fetching as “widgets become ready independently” before implementation detail.
- Expand acronyms on first use, especially Model Context Protocol (MCP), then use the acronym.
- Distinguish “available now,” “requires configuration,” and “experimental/preview” behavior.
- Avoid the grammar/spelling mistakes and inconsistent capitalization present in older posts; preserve the voice, not the errors.
- End with explicit next actions: upgrade/read migration guidance, try the demo, read the full changelog, and provide feedback.

## Screenshot, GIF, and video conventions

### Observed asset layout

The durable local pattern is a sibling `img/` directory beside `index.mdx` with descriptive kebab-case names:

```text
<post>/index.mdx
<post>/img/argus.png
<post>/img/argus-configuration.png
```

Sources: `apps/docs/blog/2025/08-02-using-argus/index.mdx:13`, `apps/docs/blog/2025/08-02-using-argus/index.mdx:65`, and files under `apps/docs/blog/2025/08-02-using-argus/img/`.

Observed local formats are PNG and WebP. There are no locally stored blog GIF or video files. The only GIFs used by release posts are a shared docs GIF and a remote Discord CDN GIF; the only MP4 is remote GitHub user content. Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:30-39`, `apps/docs/blog/2023/01-11-version0.11/index.mdx:59`, `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:62`.

Recent posts favor local assets. Older releases rely heavily on GitHub user-content and Discord CDN URLs. For 2.0, store final media locally with the post so the article does not depend on expiring chat/CDN links and the exact published asset is reviewable in the same change.

There is no fixed crop or aspect-ratio convention. Checked-in local assets range from small focused UI captures (for example 450×218) to near-full-screen captures (up to 1920 pixels wide) and tall configuration screenshots. Therefore, the 2.0 set should establish its own consistent visual system: tightly crop each capture to the named feature, avoid unrelated browser/desktop chrome, use a consistent scale, and reserve full-dashboard wides only for layout-wide changes.

### Static screenshots

The current, clearest syntax is:

```md
![Specific, useful alt text](./img/descriptive-kebab-case.png)
```

Examples: `apps/docs/blog/2025/01-19-migration-guide-1.0/index.mdx:19`, `apps/docs/blog/2025/08-02-using-argus/index.mdx:13`, `apps/docs/blog/2025/08-02-using-argus/index.mdx:65`.

Older posts often use empty or generic alt text (`![](...)`, `![image](...)`). Do not copy that weakness; descriptive alt text is compatible with the same Markdown pattern and makes a long visual article navigable.

Markdown images inside article content automatically receive the configured image-zoom behavior. The selector targets `.markdown :not(em) > img`; zoomed images have `0.5rem` rounding and a blurred/dimmed overlay. Sources: `apps/docs/docusaurus.config.ts:282-291`, `apps/docs/src/css/custom.css:347-353`, `apps/docs/src/css/custom.css:365-368`.

### GIFs

GIFs use ordinary Markdown image syntax:

```md
![Concise description of the interaction](./img/descriptive-action.gif)
```

The historical examples omit useful alt text and either reuse a docs GIF or point at Discord. Sources: `apps/docs/blog/2023/01-11-version0.11/index.mdx:59`, `apps/docs/blog/2023/04-16-version0.12-more-widgets/index.mdx:58-62`.

Use GIFs only for short, focused loops where motion is essential (drag-and-drop, multi-select move, switcher/CMD+K interaction). Prefer a still image for static settings and forms. Keep an MP4 master even when delivering a GIF derivative; this supports higher-quality reuse outside the docs.

### MP4/video

The only blog precedent is raw MDX/HTML with a `<video>` element capped at 600px, rounded inline, with controls and a nested MP4 source. Source: `apps/docs/blog/2023/01-11-version0.11/index.mdx:30-39`.

The historical attribute spelling (`autoplay`) is old JSX style. Elsewhere in the current docs app, React video uses `autoPlay`, `loop`, and `muted`. Source: `apps/docs/src/components/pages/home/drag-and-drop/drag-and-drop-showcase.tsx:1-21`.

For a new local release clip, use current MDX/React casing and browser-safe autoplay semantics:

```mdx
import interactionVideo from "./img/descriptive-action.mp4";

<video
  style={{ maxWidth: "min(100%, 960px)", borderRadius: "0.5rem" }}
  controls
  autoPlay
  loop
  muted
  playsInline
  preload="metadata"
>
  <source src={interactionVideo} type="video/mp4" />
</video>
```

This modern snippet is a recommendation, not an exact existing blog copy. The current docs already use static ES imports from MDX for local images and from TSX for local MP4 files, so it follows the active bundling pattern; still verify the finished post in the docs build. Sources: `apps/docs/docs/integrations/bazarr/index.mdx:18-33`, `apps/docs/src/components/pages/home/drag-and-drop/drag-and-drop-showcase.tsx:1-21`. If one artifact must work in Docusaurus, GitHub, and Reddit, use an optimized GIF in Markdown and keep the MP4 as a separate linked/uploaded asset; raw `<video>` is not a portable Markdown convention.

## Recommended 2.0 article architecture (structure only)

This is a layout guide, not release copy:

1. Opening promise: what changes for a self-hoster in one short paragraph.
2. Hero screenshot or short montage showing the new dashboard as a whole.
3. “What’s new at a glance”: grouped, bold-label bullets rather than one unstructured list.
4. `<!-- truncate -->`.
5. The dashboard becomes a control surface: Assistant + MCP, actions, permission-aware behavior.
6. Building boards is faster: DnD, multi-select moves, automatic mobile boards, sidebars, board switcher, configurable header, CMD+K.
7. Custom Widgets v2 and Workshop: authoring, options, POST/button actions, memory improvement, sharing/discovery.
8. Widgets and data pipeline: advanced modes, parallel fetch, caching, measured browser-memory improvement.
9. Setup and administration: onboarding/autodetect, login/auth, automatic provisioning, simplified permissions, permission filtering.
10. Docker and integrations: multiple endpoints, Docker labels/Homepage labels, fewer-click add flows.
11. Branding and polish: instance-wide branding, colors/radius, global custom CSS, UI/UX changes.
12. Upgrade/compatibility/security notes in a dedicated admonition or section.
13. Full changelog, documentation, demo, and feedback CTAs.

Give every major interaction one primary visual. Do not illustrate every bullet; cluster related changes around a screenshot or short clip that proves the whole workflow. Captions/body copy should identify what to notice rather than merely restating the heading.

## Validation gates for the eventual post

1. Confirm every author key exists in `apps/docs/blog/authors.yml`.
2. Confirm every local image/GIF/video path and every internal link from the built article.
3. Check the blog index excerpt ends at the intended truncate marker.
4. Check desktop and mobile rendering, both light and dark modes, including image zoom and video fallback.
5. Check media sizes and animation duration before committing; the existing repository does not impose an asset budget, so this must be reviewed explicitly.
6. Run the focused docs build from the repository root: `pnpm turbo build --filter=@homarr/docs`. The package build is `docusaurus build`; the repository pins pnpm 11.15.1. Sources: `apps/docs/package.json:6-16`, `package.json:92-96`.

The build is an important gate because this site throws on broken Markdown links, links, anchors, and duplicate routes rather than silently publishing them. Source: `apps/docs/docusaurus.config.ts:35-37`, `apps/docs/docusaurus.config.ts:52-57`.
