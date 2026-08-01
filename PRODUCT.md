# Product

## Users

Homarr serves people and teams who run self-hosted applications and want one dependable dashboard for launching apps, monitoring services, and viewing live operational data. They use it across wall displays, desktops, tablets, and smaller devices, often returning to the same board many times per day.

## Product Purpose

Homarr makes self-hosted services easy to find, understand, and operate without hand-editing configuration files. A successful board loads immediately, stays visually stable, keeps widgets legible across screen sizes, and makes editing feel direct and forgiving.

## Brand Personality

Fast, capable, and approachable. Homarr should feel like a mature productivity tool: dense when useful, calm in view mode, and explicit about state during editing.

## Anti-references

Avoid cramped tile spacing, undersized text, layout shifts, decorative motion, hidden drag targets, modal-heavy positioning controls, and dashboards that require users to understand grid internals. Editing must not make the read-only experience heavier or slower.

## Design Principles

- Preserve the board: viewing is the primary workflow and must render before editor code is needed.
- Make spatial actions direct: moving, resizing, nesting, and using fixed sidebars should happen on the canvas with immediate feedback.
- Keep content predictable: fixed logical tile sizes preserve widget composition, typography, and controls at every viewport.
- Recover gracefully: collision handling, reflow, loading states, and persistence failures must never lose or obscure content.
- Use familiar controls: Mantine patterns, clear labels, keyboard support, and visible focus states take priority over novel decoration.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Maintain keyboard equivalents for drag and resize operations, useful landmarks and announcements, sufficient contrast, readable control sizes, reduced-motion support, and horizontal scrolling before scaling content below an accessible minimum.
