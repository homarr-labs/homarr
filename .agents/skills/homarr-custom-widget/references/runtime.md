# Runtime

Templates read `data.requestId`, `status.requestId`, `options.name`, and temporary `inputs.name`. Status contains `loading`, `ok`, `status`, `statusText`, and `error`.

`bind="search"` creates an in-memory input. It is never persisted. Supply invocation values only through `params`, for example:

```jsx
<TextInput bind="search" label="Search" />
<SubFetch requestId="search" params={{ query: inputs.search }}>
  {(items) => <Stack>{(items ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

`SubFetch` with `trigger="manual"` renders its own load button. Its optional second callback argument contains `{ ok, status, statusText, loading: false }`; loading and request failures are rendered by `SubFetch` before the callback runs. Do not author `onClick` or a fetch callback.

Use expression callbacks for supported collection methods and trusted slots. Do not use callback blocks, IIFEs, authored recursion, or raw events. Bounded regex literals work only with safe string matching/replacement operations.
