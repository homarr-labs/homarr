# Homarr

Homarr is a self-hosted dashboard that renders live data from the services a user runs.
A board is the surface users see; integrations are how it reaches their services.

## Language

### Boards and layout

**Board**:
A named surface of widgets that users navigate to.
_Avoid_: Dashboard, page

**Layout**:
A board's arrangement of sections and items for one breakpoint, such as Base or Mobile.
_Avoid_: Grid, viewport

**Lane**:
One of a board layout's vertical bands — left, main, right — anchored by a root section; "gutter" is a legacy/API alias for a side lane, with "lane" preferred. Side lanes can contain items and nested container sections when allocated columns.
_Avoid_: Column, gutter

**Section**:
A grouping of items inside a layout; a root section anchors a lane, while a container section can be nested inside another section.
_Avoid_: Group (that means people), category

**Column**:
The horizontal grid unit used to size and position items and container sections within a lane or section; unallocated empty spacing is a gap, not a column or lane.
_Avoid_: Slot

### What appears on a board

**Widget**:
A kind of thing that can be placed on a board, drawn from `widgetKinds`.
_Avoid_: Item (that is a widget placed on a board)

**Item**:
One widget placed on one board, carrying that board's options for it.
_Avoid_: Widget, when the placement is what you mean

**App**:
A saved service link — name, icon, href, optional ping URL — that exists on its own and belongs to no board.
_Avoid_: Bookmark, link, shortcut

**App widget**:
The widget kind that renders Apps on a board.
_Avoid_: App, which is ambiguous against the App entity

### Connections to other services

**Integration**:
A configured connection to an external service that widgets read from or act on.
_Avoid_: App, service, connector

**Custom widget**:
A widget authored in JSX and installed from Workshop or written inside Homarr, whose capabilities are declared rather than assumed.
_Avoid_: Plugin, extension, userscript

**Workshop**:
The community exchange for publishing and installing Custom widgets.
_Avoid_: Marketplace, store, registry

### Scheduling

**Task**:
A scheduled job as the user sees it, listed and triggered from the Tasks page.
_Avoid_: Cron job, in user-facing copy

**Cron job**:
The internal scheduler unit that a Task configures and the job manager executes.
_Avoid_: Task, when the machinery is what you mean

### People and access

**User**:
A person who signs in to the instance.
_Avoid_: Account, member

**Group**:
A named set of users that permissions are granted to, instead of granting them to users directly.
_Avoid_: Role, team

**Permission**:
One allowed action granted to a group.
_Avoid_: Scope, capability

**Invite**:
A pending offer for someone to join the instance as a user.
_Avoid_: Invitation, request

### Configuration and assets

**Server setting**:
Instance-wide configuration an administrator sets once and every user inherits.
_Avoid_: Global config, env var

**Onboarding**:
The guided first-run flow that creates the administrator, sets preferences, discovers services, and builds the first board.
_Avoid_: Setup wizard, studio

**Media**:
A file uploaded to Homarr and stored by it.
_Avoid_: Upload, asset, image

**Icon**:
A resolvable image that an App displays, sourced from an icon repository.
_Avoid_: Logo, favicon

**Certificate**:
A trusted certificate added so Homarr can reach integrations behind self-signed TLS.
_Avoid_: Cert, CA

**Search engine**:
A configured web-search provider that Homarr's search modes query.
_Avoid_: Provider, search source
