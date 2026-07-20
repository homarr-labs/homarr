# JSX runtime

Templates read four roots: `data.<requestId>`, `status.<requestId>`, `options`, and `inputs`.

Use Mantine Core, Dates, Charts, safe Tabler icons, and Homarr runtime components. Safe installed Mantine exports are discovered automatically. Ordinary serializable props and Mantine style props pass through; `style` and `styles` are scoped and sanitized.

Render icons as `<TablerIcon name="server" size={18} />`. When connected, retrieve `homarr://custom-widgets/components/TablerIcon` for the supported icon names.

Use `SubFetch` for a manual query, `ActionButton` or `ToggleSwitch` for an action, and `RefreshButton` to refresh data. A query with `trigger: "load"` populates its data automatically and follows the widget refresh interval.

Manual requests receive values only from the invoking component:

```jsx
<SubFetch requestId="search" params={{ query: inputs.search }} />
<ActionButton requestId="restart" params={{ id: container.Id }}>Restart</ActionButton>
```

Loop variables and other JSX expressions can flow into a request only through that `params` prop. A load query has no invoking component, so every declared parameter must have an `optionsBinding` entry:

```json
{
  "parameters": { "endpointId": "string", "showAll": "boolean" },
  "optionsBinding": {
    "endpointId": { "$option": "endpointId" },
    "showAll": false
  }
}
```

Do not rely on parameter and option names matching. For an invalid-placeholder or unresolved-parameter error on a load query, check missing `optionsBinding` entries before changing placeholder syntax.

Bind local controls declaratively:

```jsx
<TextInput bind="search" label="Search" />
<DatePicker bind="selectedDate" />
<Select bind="selectedEntity" data={options.entities} />
```

Bound inputs exist only in memory while the widget is mounted and reset on reload. They are available as `inputs.<bindName>` and are never saved to local storage. Put durable user configuration in options. Do not author raw component callback props.

Binding types follow the component mode. `Accordion multiple`, `Chip.Group multiple`, `TreeSelect mode="multiple"|"checkbox"`, and date pickers with `type="multiple"|"range"` expose `string[]`. `DateTimePicker` and `InlineDateTimePicker` support `type="range"`, but not `multiple`. Components that do not advertise a temporary bind cannot use `bind`.

## Immutable local bindings

Collection callbacks may use a tightly constrained block body when a value would otherwise be recomputed throughout the returned JSX:

```jsx
{data.pokemon.map((pokemon) => {
  const segments = pokemon.url.split("/").filter((part) => part);
  const dexId = segments.at(-1);
  const favorite = inputs.favorites.includes(pokemon.name);

  return (
    <Card key={dexId}>
      <Text>#{dexId}</Text>
      <Text>{pokemon.name}</Text>
      {favorite && <Badge>Favorite</Badge>}
    </Card>
  );
})}
```

A page-level derived value may use a directly invoked, zero-argument inline arrow:

```jsx
{(() => {
  const visiblePokemon = data.pokemon.filter(
    (pokemon) => !inputs.favoritesOnly || inputs.favorites.includes(pokemon.name),
  );

  return <Stack>{visiblePokemon.map((pokemon) => <Text>{pokemon.name}</Text>)}</Stack>;
})()}
```

A safe block contains one or more `const` declarations followed by exactly one final `return`. Each declaration uses one simple identifier and a required initializer made from existing safe expressions. Earlier local bindings are available to later initializers and to the return expression.

The following remain invalid:

- `let`, `var`, assignment, update expressions, or destructuring.
- Function or class declarations, and function values stored in `const`.
- Loops, `if`, `switch`, `try`, `catch`, `throw`, labels, or `new`.
- Async functions, generators, `await`, or `yield`.
- Early or multiple returns.
- Duplicate local names or shadowing `data`, `status`, `options`, or `inputs`.
- Invoking a function obtained from API data or a property. Only a directly invoked zero-argument inline arrow is an IIFE.

Local evaluation shares the parent widget's depth, operation, collection, string, and rendered-node budgets. Blocks cannot reset or evade those limits.

Block diagnostics include `INVALID_LOCAL_DECLARATION`, `LOCAL_BINDING_REQUIRES_INITIALIZER`, `DUPLICATE_LOCAL_BINDING`, `RESERVED_LOCAL_BINDING`, `UNSUPPORTED_BLOCK_STATEMENT`, `BLOCK_REQUIRES_FINAL_RETURN`, and `CALLBACK_VALUE_NOT_ALLOWED`.

## Arbitrary-depth trees

Use Homarr's trusted `RecursiveList` special form instead of authored recursive functions or Mantine callback props:

```jsx
<RecursiveList
  data={data.evolution.chain}
  childrenPath="evolves_to"
  keyPath="species.name"
  maxDepth={16}
  defaultExpandedDepth={4}
  showLines
>
  {(node, meta) => {
    const segments = node.species.url.split("/").filter((part) => part);
    const dexId = segments.at(-1);

    return (
      <Group gap="xs">
        <Badge>#{dexId}</Badge>
        <Text>{node.species.name}</Text>
        {meta.hasChildren && <Text c="dimmed">{meta.childCount} evolutions</Text>}
      </Group>
    );
  }}
</RecursiveList>
```

The child template receives the current `node` and:

```ts
interface RecursiveListMetadata {
  depth: number;
  index: number;
  path: number[];
  key: string;
  hasChildren: boolean;
  childCount: number;
  isLast: boolean;
}
```

`data` accepts one root object or an array of roots. `childrenPath` and `keyPath` use restricted dotted property paths; prototype-related segments are invalid. Missing children mean an empty list. Keys must resolve to primitives; missing or duplicate keys use a stable path fallback and record a warning.

Authorable presentation props are `data`, `childrenPath`, `keyPath`, `maxDepth`, `maxNodes`, `defaultExpandedDepth`, `indent`, `gap`, and `showLines`. Default limits are depth 16 and 500 nodes. Hard limits are depth 32 and 2,000 nodes. Cycles are detected per ancestor chain. Invalid branches and reached limits render a contained diagnostic or an “Additional levels omitted” row without crashing the tile.

Always render a useful loading state from `status`, an empty state, a contained error state, and layouts that work at roughly 320, 480, and 720 pixels wide. Use accessible labels and confirmations.

This reference and the package component references are complete for offline authoring against the matching release. When connected, prefer live component metadata and examples because the installed Homarr and Mantine versions may differ.
