# Smart stack — native Homarr prototype

Issue: [#7393](https://github.com/homarr-labs/homarr/issues/7393). [Design record and verification](../../../../../../../docs/research/iphone-smart-stack-prototype.md). [Earlier research](../../../../../../../docs/research/adaptive-containers.md).

Run from this checkout, with the project's dependencies and pinned runtime installed:

```sh
mise exec -- bun run prototype:smart-stack
```

Open the [prototype board](http://localhost:7395/boards/adaptive-containers-prototype?variant=A).

This is a separate experiment on `feat/prototype-smart-stack`. It uses Homarr's existing board route, header, theme, grid/container renderer, and registry-loaded widgets. The earlier adaptive-container worktree remains separate.

One **SMART STACK** contains three pages:

- **Watching:** Currently playing.
- **Services:** Downloads and Requests share the available space.
- **Overview:** a native Clock and Stats widget.

Compare **A · Stack** (vertical navigation), **B · Reel** (neighboring-state glimpses), and **C · Inspector** (enabled-state tray) with the floating bar's variant arrows. They share the same behavior; `?variant=A`, `B`, or `C` selects the design. The top App tiles, side Clock, and Quick access section remain native board content.

Open **Activity** to change fixture counts or choose a scenario. Children within the selected page share a maximum of six rows: a busy service grows while its idle sibling contracts. Page buttons/arrows browse manually and hold that choice until **Resume**.

The outer frame defaults to six rows. Optional reclaim follows smaller page allocations; Reel and Inspector retain at least three rows for their navigation. The native Clock fills five rows above one Stats row in the default Overview page.

Use **Edit stack** for the native Mantine **Edit smart container** modal. It moves the five existing widget bodies into its preview instead of creating duplicate widgets. Controls stay beside the real preview, with previous/next paging and the selected position below. Tabs are vertical on desktop and horizontal on a phone:

- **States:** edit labels, order, enabled pages, and relevance priorities.
- **Rotation:** compare Manual, Timed, Smart, and Hybrid; adjust the interval and interaction pauses.
- **Appearance:** change the design preset, accent, transition, and reclaim behavior.
- **Data:** send scenarios or change the mock record counts.

The default is **Hybrid, 12 seconds**. Manual never switches automatically. Timed cycles enabled page order, optionally skipping inactive pages. Smart promotes the highest-priority relevant page when activity or priorities change, retains ties, and has no timer. Hybrid combines timed paging with activity-driven promotion. Manual browsing holds until Resume. Editing, focused content, a hidden browser tab, and configured hover pauses freeze the countdown.

**Apply** adopts preview settings; **Cancel** restores the opening settings and design URL, including a pending design change. Both retain incoming activity counts and preserve an existing manual hold. If automatic Smart/Hybrid selection was enabled, closing reconciles the latest activity and priorities, so the selected page can change. Timed resumes its opening page/countdown, resetting the countdown when an applied mode or interval changes. Page membership and overlapping fixture placements are authored for this experiment; global board layout editing is outside its scope.

The launcher seeds a public board in `/tmp/homarr-iphone-smart-stack/PROTOTYPE-wipe-me.sqlite`, starts Redis on **6398**, and serves Homarr on **7395** with a distinct cookie prefix. Stop with Ctrl+C. `PROTOTYPE_DATA_DIR`, `PROTOTYPE_PORT`, `PROTOTYPE_REDIS_PORT`, and `PROTOTYPE_PUBLIC_URL` override local defaults. Each launch resets this fixture board.

Only this development board receives fixture transport for native Currently playing, Downloads, Requests, and Stats queries. Other procedures use Homarr's real API and scratch database. Activity, selection, and settings stay in memory and reset on reload; hidden widget bodies stay mounted.

Manual checks cover desktop A/B/C rendering, widget reuse without duplication, timed paging, hover pause, Smart promotion/manual hold/Resume, Hybrid behavior, state reorder, and Apply/Cancel restoration. At 390×844, the phone modal fits without horizontal document overflow; preview/settings remain scrollable and Apply/Cancel stay visible. No automated tests or builds ran. Counts and priorities are fixture inputs, not DOM measurements or a production relevance algorithm; upstream behavior, authorization, freshness, persistence, and nested/side-lane support remain unverified. No production design has been selected.
