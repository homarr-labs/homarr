---
name: mantine-ui
description: Build, change, or review Homarr application UI using Mantine component discovery, current documentation, built-in props, and the Styles API. Use for component selection, layout, responsive behavior, and styling changes.
---

# Mantine UI

## Discover and read before editing

1. Check the owning workspace's Mantine dependencies and existing `packages/ui` components. The live docs may describe a newer release; confirm the chosen API exists in the installed version.
2. At the start of a UI task, call the `mantine` MCP server's `list_items({"kind":"component","limit":500})` to discover the available components across Core and extensions. Use `package`, `category`, or `query` filters to narrow the catalog, and `search_docs` for the behavior you need. Check hooks when they can replace custom interaction or state code.
3. **Always call `get_item_doc` for each component or hook you introduce or change, before implementing it.** Reuse documents already fetched during the task. For component styling, request `full: true` so you read the props and complete Styles API, including inner selectors and public CSS variables; an outline alone is insufficient. `get_item_props` and `get_api` supplement this lookup.

For example:

```json
{ "name": "Heatmap", "full": true }
```

When working on styling, also consult `get_item_doc` for `styles-style-props` and `styles-styles-api`. The default response is an outline; fetch the relevant `section` or use `full: true`.

## Prefer Mantine's styling features

Choose the first option that expresses the requirement:

1. **Component props:** use the documented `size`, `variant`, `color`, `radius`, `orientation`, `fullWidth`, `withBorder`, `shadow`, and similar props. Reuse built-in controls before constructing a custom equivalent, and use the polymorphic `component` prop when only the rendered element needs to change.
2. **Layout and style props:** use `Group`, `Stack`, `Flex`, `Grid`, `SimpleGrid`, and `Box`, with spacing, sizing, alignment, and responsive props. Use theme tokens and public CSS variables for values that should follow Homarr's theme.
3. **Styles API:** target documented inner selectors with `styles` and public component CSS variables with `vars`. Keep overrides on the owning component so shared editors retain one styling implementation. Preserve the theme and unrelated screens during a focused change.
4. **CSS modules through `classNames`:** use these for pseudo-classes, nested selectors, or responsive rules that the component and style props cannot express. The `styles` prop accepts flat inline styles, not nested selectors or media queries. Keep only the CSS needed for that remaining behavior.

Before finishing a UI change, account for every new CSS rule against these options, remove superseded rules, and verify shared callers and the intended responsive widths.

## Official Markdown fallback

Use the MCP server first. If its tools are unavailable or a request fails, read the corresponding official LLM Markdown document and report the tool failure briefly. Prefer the returned item's `llmUrl`, the page's LLM documentation link, or the [documentation index](https://mantine.dev/llms.txt) to find the exact URL.

For example:

- Component page: <https://mantine.dev/charts/heatmap/>
- Full LLM documentation, including props and Styles API: <https://mantine.dev/llms/charts-heatmap.md>

Fetch the pages needed for the task instead of loading `llms-full.txt`. See [Mantine with LLMs](https://mantine.dev/guides/llms/) for the official MCP and documentation workflow.
