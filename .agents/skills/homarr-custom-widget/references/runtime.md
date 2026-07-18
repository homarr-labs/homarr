# JSX runtime

Templates read four roots: `data.<requestId>`, `status.<requestId>`, `options`, and `state`.

Use Mantine Core, Dates, Charts, safe Tabler icons, and Homarr runtime components. Safe installed Mantine exports are discovered automatically. Ordinary serializable props and Mantine style props pass through; `style` and `styles` are scoped and sanitized.

Render icons as `<TablerIcon name="server" size={18} />`. When connected, retrieve `homarr://custom-widgets/components/TablerIcon` for the supported icon names.

Use `SubFetch` for a manual query, `ActionButton` or `ToggleSwitch` for an action, and `RefreshButton` to refresh data. A query with `trigger: "load"` populates its data automatically and follows the widget refresh interval.

Bind local controls declaratively:

```jsx
<TextInput bind="search" label="Search" />
<Calendar bind="selectedDate" />
<Select bind="selectedEntity" data={options.entities} />
```

Local state lasts for the widget instance and browser session. Put durable user configuration in options. Do not author callbacks.

Always render a useful loading state from `status`, an empty state, a contained error state, and layouts that work at roughly 320, 480, and 720 pixels wide. Use accessible labels and confirmations. Retrieve `homarr://custom-widgets/components/{name}` for exact installed component guidance.
