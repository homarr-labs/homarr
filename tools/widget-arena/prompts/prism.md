Author a finished Homarr widget that feels like part of the application, not an embedded website. Let Mantine's existing theme do the visual work. The goal is quiet confidence: a clear reading order, useful information, recognizable controls, and enough breathing room to understand the data immediately.

## Work from the task outward

Read the supplied task, frozen base definition, data envelopes, and portable runtime contract first. Change only `template`; preserve every other definition field exactly. Keep every required fact, field, interaction, and state. Decide silently what the user needs to notice first, what explains it, and what they can do next. Express that hierarchy through placement and typography rather than adding decorative content. Do not emit your rationale.

## Compose a native visual language

Build around registered Mantine primitives. A `Stack` establishes vertical rhythm; wrapping `Group` rows align related labels, values, and controls. Use consistent `gap`, `p`, `px`, and `py` theme tokens instead of many unrelated measurements. Prefer open sections separated by spacing. Add a subtle surface or boundary only when it explains a genuine grouping; do not frame every metric or nest bordered cards.

Use `Text` weight and size to distinguish the main answer, supporting detail, and metadata. Keep normal content comfortably readable and every text element, including badges and actions, at least 12px. Reserve `c="dimmed"` for secondary context, never essential results. Use a short, readable `Badge` with a restrained `light` variant for meaningful status; pair color with words. Do not turn all metadata into pills. Retain inherited fonts, theme colors, radii, and light/dark behavior. Avoid fixed white/black surfaces, ornamental gradients, oversized hero numbers, and custom branding.

## Let the information choose its shape

Present related records with consistent label/value alignment and visible units, dates, and names. Use charts when relationships or change over time matter, not to fill space. For time series, a registered `LineChart` can use the supplied `data`, matching `dataKey` and `series`, explicit height, meaningful `unit`, and a legend when needed. Keep gaps honest with `connectNulls={false}`. Include nearby textual results so interpretation never depends on hover or color. Never invent samples, thresholds, totals, or precision.

## Make the composition resilient

Design for the widget's actual container, both narrow and wide, not the browser viewport. Let rows wrap, let text break, and allow shrinking content with `miw={0}` where necessary. Keep controls reachable. Fit through hierarchy and appropriate spacing, never by hiding required data, clamping essential text, clipping overflow, or shrinking typography. Distinguish loading, empty results, unavailable values, and errors; absence is not zero or success. Preserve all prescribed actions using only the supplied runtime mechanisms.

Use only registered components, supported props, and allowed template expressions. Prefer component/layout props; use flat, scoped `style` or documented `styles` selectors only for a remaining need. No imports, hooks, authored event handlers, CSS media queries, external HTTP, or unsupported JSX features. The shared contract is authoritative over library examples.

Return only the complete JSON array required by the shared output protocol: no fences, commentary, design labels, or claims about testing, installation, or lifecycle.
