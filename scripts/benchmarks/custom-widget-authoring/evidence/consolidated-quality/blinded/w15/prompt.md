You are a hostile-but-fair product review panel evaluating a safe dashboard widget. Most competent drafts should score 55-75, not 90. Judge only evidence present in the manifest and JSX. Never reward unsupported capabilities, invented API routes, aspirational claims, or code that merely validates.

The installed Homarr skill and runtime references below are authoritative. The verified API notes and representative response fixtures are authoritative for endpoint paths, authentication requirements, and response shapes unless the validated manifest contradicts them. Do not invent external endpoint or authentication objections from outside assumptions. Judge only the scoped Request below; an endpoint mentioned in broader API notes is available, not automatically required, and an optional fixture field omitted by the scoped Request is not a missing capability. Decorative icons paired with equivalent adjacent visible status text need no separate aria-label. A Badge containing explicit visible status text is not color-only. Date.toLocaleString(value, "en-US", "UTC") is an installed safe static helper for concise absolute UTC timestamps; do not require relative time. In particular, request state is exposed as status.<requestId> with loading/ok/status/error fields while successful payloads are exposed as data.<requestId>. RefreshButton is an installed runtime helper: it refreshes load queries by default; inside a successful manual result, requestId targets and reruns that active query with unchanged parameters. A bound Pagination should declare defaultValue={1}; resetKey={inputs.query} restores that default when its dependent scalar query changes. SubFetch without trigger="manual" runs automatically and reruns when bound params change, so never demand a hidden input, debounce callback, or raw event. When the scoped Request requires manual search, do not penalize the required re-trigger after query or page changes. A manual SubFetch synchronously hides its old result and returns to its trigger when its request ID, normalized parameters, or effective definition changes; it cannot display stale results under edited inputs or fetch the new parameters before another trigger. ActionButton supplies pending UI, native success/error notification, confirmation, and declared invalidation; do not demand duplicate local action state. Safe templates forbid local declarations and helper functions; do not penalize a repeated short literal label array used for distinct enum fields, or a repeated pure collection/count expression that must drive both an empty branch and rendered content, as an avoidable missing abstraction. Every component in this already-validated template exists in the installed release. Do not penalize those documented facts. The widget has already passed Homarr's real schema and JSX analyzer, which proves syntax and component compatibility but does not prove API correctness, visual quality, usefulness, or accessibility.

Task-relevant installed Homarr runtime references:
# Runtime

Load-query templates read `data.requestId` and `status.requestId`, plus `options.name` and temporary `inputs.name`. Manual `SubFetch` results stay local to that instance and never populate `data`/`status`; render them in its child callback. Status is `{ loading, ok, status, statusText, error }`. Render load queries directly from `data` and `status` with `RefreshButton`; never wrap them in `SubFetch`.

`bind` is temporary; manual request values go in `params` and map to `$param`:

```jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

Manual queries require `trigger: "manual"` on request and `SubFetch`; otherwise they run automatically. `triggerContent` with `triggerAriaLabel` makes custom content the launcher; it is already wrapped in a button, so use non-interactive content such as Text or Card, never Button, Anchor, or form controls inside it. `SubFetch` owns loading/error/retry; its child receives success plus `{ ok, status, statusText, loading: false }`. Never author `onClick` or fetch callbacks.

`SubFetch`, `ActionButton`, and `ToggleSwitch` need literal `requestId`; validation rejects missing/computed IDs.

After an explicit `ActionButton` or `ToggleSwitch` invocation, its response is published as `data.requestId` and `status.requestId` in that widget instance. Guard the initial state before any action has run. This local response is not persisted across reloads; actions never execute automatically.

SubFetch/ActionButton params must contain exactly the names referenced by $param or {param:name} in that request. Fixed query values such as limit or fields belong in requests.<id>.query, not params. Test using the same parameter names the JSX will supply; do not fix only the test call while leaving mismatched JSX.
When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Exact paths: load request ID `q` with raw preview body `B` -> `data.q === B`. `q=events` body`{"events":[...]}` -> `data.events.events`; do not flatten repeated keys. Manual `SubFetch` receives `B` as result -> `result.events`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Format timestamps with safe static helpers; never use `new Date`. Never invent a formatter component. Use `Date.toLocaleString(value, "en-US", documentedTimezone)` and label the documented timezone; if no timezone is documented, preserve the source value or omit any timezone label; use UTC only when the response contract says UTC. For countdowns, `Date.getTime(isoTimestamp) - Date.now()` gives milliseconds; `Date.parse` is unavailable. Also available: `Date.toISOString`, plus `Date.toLocaleDateString` and `Date.toLocaleTimeString` with the same arguments. Numbers: `n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })`; `style` percent/currency/unit (with `currency`/`unit`) and `signDisplay` also work.

For compact numeric enums, index a literal label array with a fallback:

```jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
```

Request-bound controls use literal `bind` plus a default (`defaultChecked` for Switch/Checkbox); pass `inputs.<name>` through manual `SubFetch params` to matching `$param`. Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove dead controls.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots; regex is limited to safe string operations.


Request:
Create a complete Pokédex widget using PokéAPI. Make at least three deliberate refinement passes through validation and preview testing. It must have a substantial polished UI with a direct name lookup, a searchable loaded list that stays visible while details open in a separate responsive result area, sprites, types, abilities, base-stat progress bars, and clear initial, loading, empty, failure, and success states. Use a restrained accent and flexible tile sizing rather than repetitive nested cards or a fixed-height list. Completeness must come from tested useful interactions, not filler JSX.

Verified API notes:
Use GET /api/v2/pokemon?limit=<option>&offset=<option> for the list and GET /api/v2/pokemon/{param:name} as a manual detail query for both direct typed lookup and selected list items. Keep the list visible while rendering detail output. Prefer sprites.other.official-artwork.front_default from the tested detail response rather than parsing an ID from a list URL. PokeAPI needs no authentication.

Representative API response used by the preview test:
/api/v2/pokemon/{param:name}:
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "sprites": {
    "other": {
      "official-artwork": {
        "front_default": "https://example.test/pikachu.png"
      }
    }
  },
  "types": [
    {
      "slot": 1,
      "type": {
        "name": "electric"
      }
    }
  ],
  "abilities": [
    {
      "ability": {
        "name": "static"
      },
      "is_hidden": false
    }
  ],
  "stats": [
    {
      "base_stat": 35,
      "stat": {
        "name": "hp"
      }
    },
    {
      "base_stat": 90,
      "stat": {
        "name": "speed"
      }
    }
  ]
}

/api/v2/pokemon:
{
  "count": 1302,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
  "previous": null,
  "results": [
    {
      "name": "bulbasaur",
      "url": "https://pokeapi.co/api/v2/pokemon/1/"
    },
    {
      "name": "pikachu",
      "url": "https://pokeapi.co/api/v2/pokemon/25/"
    }
  ]
}

Validated widget:
{
  "$schema": "homarr-custom-widget-v2",
  "name": "Pokédex",
  "description": "Search a loaded Pokémon list and inspect PokéAPI details.",
  "sources": {
    "default": {
      "name": "PokéAPI",
      "baseUrl": "https://pokeapi.co/api/v2",
      "auth": "none"
    }
  },
  "requests": {
    "pokemon": {
      "source": "default",
      "kind": "query",
      "method": "GET",
      "path": "/pokemon",
      "trigger": "load",
      "query": {
        "limit": {
          "$option": "limit"
        },
        "offset": 0
      },
      "auth": "inherit",
      "permission": "view",
      "cacheSeconds": 300
    },
    "detail": {
      "source": "default",
      "kind": "query",
      "method": "GET",
      "path": "/pokemon/{param:name}",
      "trigger": "manual",
      "auth": "inherit",
      "permission": "view"
    }
  },
  "options": {
    "limit": {
      "label": "Loaded Pokémon",
      "description": "Number of names loaded for local search.",
      "control": "number",
      "default": 20,
      "min": 10,
      "max": 50,
      "step": 10
    }
  },
  "template": "<Stack gap='sm'>\n  <Group justify='space-between' wrap='nowrap' align='center'>\n    <Stack gap={0} style={{ minWidth: 0 }}>\n      <Text fz={20} fw={700}>Pokédex</Text>\n      <Text size='xs' c='dimmed'>PokéAPI · browse names, then open a Pokémon</Text>\n    </Stack>\n    <RefreshButton requestId='pokemon' label='Refresh Pokémon' />\n  </Group>\n  <SimpleGrid minColWidth={240} autoFlow='auto-fit' spacing='md'>\n    <Stack gap='xs' style={{ minWidth: 0 }}>\n      <TextInput bind='filter' defaultValue='' label='Search loaded names' placeholder='Filter this page' />\n      <Select bind='selected' defaultValue='' label='Choose from loaded names' placeholder='Search Pokémon' searchable clearable data={(data.pokemon?.results ?? []).map(item => ({ value: item.name, label: item.name }))} />\n      {status.pokemon?.loading ? <Skeleton height={160} /> : status.pokemon?.ok === false ? <Alert color='red' title='Pokémon list unavailable'>{status.pokemon.statusText || status.pokemon.error || 'Request failed'}</Alert> : (data.pokemon?.results ?? []).length === 0 ? <Text size='sm' c='dimmed'>No Pokémon names were returned.</Text> : <Stack gap='xs'>\n        <Group justify='space-between' wrap='nowrap' align='baseline'>\n          <Text size='sm' fw={600}>Loaded names</Text>\n          <Text size='xs' c='dimmed'>{(data.pokemon.results ?? []).filter(item => item.name.includes((inputs.filter ?? '').trim().toLowerCase())).length} shown · {data.pokemon.count ?? '—'} total</Text>\n        </Group>\n        {(data.pokemon.results ?? []).filter(item => item.name.includes((inputs.filter ?? '').trim().toLowerCase())).length === 0 ? <Text size='sm' c='dimmed'>No matches on this loaded page.</Text> : <SimpleGrid minColWidth={110} autoFlow='auto-fit' spacing='xs'>{(data.pokemon.results ?? []).filter(item => item.name.includes((inputs.filter ?? '').trim().toLowerCase())).map(item => <Text key={item.name} size='sm' truncate>{item.name}</Text>)}</SimpleGrid>}\n      </Stack>}\n      <TextInput bind='lookup' defaultValue='' label='Direct name lookup' placeholder='e.g. pikachu' />\n      <Text size='xs' c='dimmed'>A direct name takes priority over the selected loaded name.</Text>\n    </Stack>\n    <Stack gap='xs' style={{ minWidth: 0 }}>\n      <Text size='sm' fw={600}>Pokémon details</Text>\n      {(inputs.lookup ?? '').trim().length === 0 && (inputs.selected ?? '').trim().length === 0 ? <Text size='sm' c='dimmed'>Choose a loaded name or enter a direct lookup to begin.</Text> : <SubFetch requestId='detail' trigger='manual' params={{ name: (inputs.lookup ?? '').trim().toLowerCase() || (inputs.selected ?? '').trim().toLowerCase() }} triggerContent={<Text size='sm' fw={600}>Open {(inputs.lookup ?? '').trim().toLowerCase() || (inputs.selected ?? '').trim().toLowerCase()}</Text>} triggerAriaLabel='Load Pokémon details'>\n        {(pokemon) => pokemon?.name ? <Stack gap='sm'>\n          <Group align='center' wrap='nowrap' gap='sm'>\n            {pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default ? <Image src={pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default} alt={pokemon.name} h={144} fit='contain' /> : <Text size='sm' c='dimmed'>Artwork unavailable</Text>}\n            {pokemon.sprites?.front_default && pokemon.sprites?.other?.['official-artwork']?.front_default ? <Stack gap={2} align='center'><Image src={pokemon.sprites.front_default} alt={`${pokemon.name} game sprite`} h={64} fit='contain' /><Text size='xs' c='dimmed'>Game sprite</Text></Stack> : null}\n            <Stack gap={4} style={{ minWidth: 0 }}>\n              <Text fz={24} fw={700} truncate>{pokemon.name}</Text>\n              <Text size='sm' c='dimmed'>#{pokemon.id}</Text>\n              <Text size='xs' c='dimmed'>Types</Text>\n              <Group gap='xs'>{(pokemon.types ?? []).length === 0 ? <Text size='sm' c='dimmed'>—</Text> : (pokemon.types ?? []).map(item => <Badge key={item.slot} color={({ grass: 'green', fire: 'orange', water: 'blue', electric: 'lime', psychic: 'violet', ice: 'cyan', dragon: 'indigo', dark: 'dark', fairy: 'pink', normal: 'gray', fighting: 'red', poison: 'grape', ground: 'orange', flying: 'blue', bug: 'lime', rock: 'gray', ghost: 'violet', steel: 'gray' })[item.type.name] ?? 'gray'}>{item.type.name}</Badge>)}</Group>\n            </Stack>\n          </Group>\n          <SimpleGrid minColWidth={100} autoFlow='auto-fit' spacing='xs'>\n            <Stack gap={2}><Text size='xs' c='dimmed'>Height</Text><Text size='sm' fw={600}>{pokemon.height == null ? '—' : `${(pokemon.height / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })} m`}</Text></Stack>\n            <Stack gap={2}><Text size='xs' c='dimmed'>Weight</Text><Text size='sm' fw={600}>{pokemon.weight == null ? '—' : `${(pokemon.weight / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`}</Text></Stack>\n          </SimpleGrid>\n          <Stack gap='xs'><Text size='sm' fw={600}>Abilities</Text>{(pokemon.abilities ?? []).length === 0 ? <Text size='sm' c='dimmed'>No abilities listed.</Text> : (pokemon.abilities ?? []).map(item => <Group key={item.ability.name} justify='space-between' wrap='nowrap' gap='xs'><Text size='sm' truncate>{item.ability.name}</Text>{item.is_hidden ? <Badge color='gray'>Hidden</Badge> : null}</Group>)}</Stack>\n          <Stack gap='xs'><Text size='sm' fw={600}>Base stats</Text>{(pokemon.stats ?? []).length === 0 ? <Text size='sm' c='dimmed'>No base stats listed.</Text> : (pokemon.stats ?? []).map(item => <Stack key={item.stat.name} gap={2}><Group justify='space-between' wrap='nowrap'><Text size='xs' c='dimmed'>{item.stat.name}</Text><Text size='xs' fw={600}>{item.base_stat}</Text></Group><Progress value={Math.min((item.base_stat / 255) * 100, 100)} size='sm' color='violet' /></Stack>)}</Stack>\n        </Stack> : <Text size='sm' c='dimmed'>No Pokémon details were returned.</Text>}\n      </SubFetch>}\n    </Stack>\n  </SimpleGrid>\n</Stack>"
}

Scoring calibration:
- 95-100: exceptional, purpose-built quality; complete, beautiful, restrained, and something a demanding user would choose every day. Almost never award this.
- 85-94: excellent with only small, specific defects. It must fully achieve the request and feel deliberately designed.
- 70-84: good prototype or useful widget with visible compromises, generic design, missing polish, or avoidable complexity.
- 50-69: functional but incomplete, awkward, visually ordinary, overbuilt, or impractical for repeated use.
- 0-49: broken, misleading, unsafe, substantially incomplete, or incompatible.

Required review behavior:
- Compare every requested capability with concrete manifest/JSX evidence. A missing or invented core capability is fatal and caps total at 79.
- Judge whether the API design can actually reach the stated goal, including response paths, bindings, invalidation, and action safety.
- Judge visual quality, not component count: hierarchy, density, whitespace, typography, restrained color, scanability, and avoidance of repetitive nested cards.
- A purpose-specific asymmetric summary, divided hierarchy, responsive density, and restrained semantic accents can clear 75 without decorative chrome. Do not demand gradients, novelty, or a generic selected-row detail interaction.
- Judge daily usefulness: information priority, interaction cost, refresh behavior, narrow-tile usability, and whether the widget is pleasant rather than demo-like.
- Do not penalize a missing last-refreshed timestamp when the verified response has no freshness field; cache policy plus a labeled RefreshButton is complete. Do not penalize a deliberately bounded first-page view for lacking pagination unless the scoped Request asks for pagination or browsing the full collection.
- A required manual search rerun is deliberate interaction, not daily-use friction. SubFetch owns failure and retry before its child renders; never demand an unreachable child error branch or a RefreshButton there.
- Judge complexity discipline: penalize duplicate requests/options, unnecessary controls, excessive JSX, cleverness, and UI chrome that does not help the goal. Complexity must earn its place.
- Recommend only interactions supported by the installed authoring contract. Do not suggest portals, modals, arbitrary event handlers, or other blocked capabilities. Prefer a responsive in-widget detail area when separation is useful.
- A visually generic but valid widget should normally score below 75 for visualQuality. A widget that is attractive but inconvenient should score below 75 for dailyUsefulness.
- Give a concrete evidence sentence for every category. List all score-capping issues under fatalProblems.
- Return an empty fatalProblems array when there are no fatal problems; never put "none" or an explanation of their absence in that array.

Homarr computes the weighted total and final verdict itself. Your total and verdict are advisory, but must be internally honest. A pass requires a weighted total of at least 85, every category at least 75, goalFulfillment at least 85, complexityDiscipline at least 80, no fatal problem, and dailyUseDecision="would-use-daily". Return only the requested structured object.

Return ONLY one JSON object (no prose, no code fence) with exactly these keys:
{"total": 0-100, "verdict": "pass"|"fail", "dailyUseDecision": "would-use-daily"|"promising-but-not-daily"|"not-practical",
 "categories": {"schemaAndBindings":0-100,"apiAndRequestDesign":0-100,"runtimeCompatibility":0-100,"goalFulfillment":0-100,"visualQuality":0-100,"responsiveAndTheme":0-100,"loadingEmptyErrorSuccess":0-100,"dailyUsefulness":0-100,"complexityDiscipline":0-100,"accessibility":0-100,"actionSafety":0-100},
 "categoryReasons": {same keys: one evidence sentence each},
 "strengths": [..<=6], "problems": [..<=12], "fatalProblems": [..<=8], "highestImpactFixes": [..<=6]}

