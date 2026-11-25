# Runtime

Load q with body B gives `data.q === B`; `q=events`/`B={"events":[...]}` gives `data.events.events`.
Keep sibling states independent, guard optional arrays/nesting, and handle loading/error/empty/success.
Status is `{ loading, ok, status, statusText, error }`; `status.q?.ok === false` means error.
One RefreshButton per load stays outside its branches; `requestId`, never `request`. Omit it to refresh all loads.

Options are installation config (`options.name`). Temporary controls use literal `bind`, defaults and `inputs.name`:

```jsx
<Stack>
  <TextInput bind="search" label="Search" defaultValue="" />
  <NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
  <SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
    {(result) => (
      <Stack>
        {(result.results ?? []).map((item) => (
          <Text key={item.id}>{item.name}</Text>
        ))}
      </Stack>
    )}
  </SubFetch>
</Stack>
```

Manual queries set trigger manual on request and SubFetch. Their body stays local to the child `(result, meta)`, never global
data/status. SubFetch owns loading/error/retry; meta has ok/status/statusText/loading=false. When ID, params or definition
changes, the previous result hides until triggered again. RefreshButton inside success reruns captured params.
SubFetch/ActionButton/ToggleSwitch require literal requestId. triggerContent/triggerAriaLabel is already a button: use
non-interactive content. Actions run explicitly, publish local data/status until reload, and retain confirmation/permissions/invalidates.

Params match exactly the request's $param/{param:name}: string/number/boolean, never undefined/null.
Fixed values belong in query/body. Omitted optional values need verified request variants; empty strings need API support.
Validate nonblank optional inputs, show field errors and block invalid requests. Every control changes a request/selection.
Switch/Checkbox use defaultChecked; dependent pagination uses defaultValue={1}/resetKey={inputs.query}.

Safe Date: toISOString/toLocaleString/toLocaleDateString/toLocaleTimeString/getTime/now. Guard timestamps; pass
Date.toLocaleString(value, "en-US", documentedTimezone), otherwise omit timezone argument/label. UTC requires a UTC contract.
Countdown milliseconds: Date.getTime(isoTimestamp) - Date.now(). No constructors, Date.parse or Intl.
Numbers support `n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })`, percent/currency/unit/signDisplay.
Guard scalar types and finite numbers, preserve 0/false, and use — for missing values. Convert numbers before relabeling units.
Map cross-collection IDs to verified names or retain IDs. Follow documented rate semantics.

Keep requested fields/collections reachable through summaries, tables/details, filters, pagination or a bounded ScrollArea; never silently slice rows.
Label partial results/totals and verify pagination. Bounded response observations are not full schemas.

Verified Mantine 9.6.0: LineChart/AreaChart/BarChart require positive h, data: row[], dataKey: category/time key, series: [{name: actual numeric row key, color: MantineColor}]. Sparkline requires positive h and data: number[]. Use real fields/series; no invented history/formatter callbacks. Other props stay lazy.

Use registered names, Icon/TablerIcon with installed kebab-case names, concise expression callbacks and bounded regex.
Callback parameters cannot shadow data/status/options/inputs. Never invent IconFoo components or raw browser callbacks.
