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
  "description": "Search Pokémon by name or browse a searchable list with stats and official artwork.",
  "sources": {
    "default": {
      "baseUrl": "https://pokeapi.co",
      "auth": "none"
    }
  },
  "requests": {
    "pokemonList": {
      "source": "default",
      "kind": "query",
      "method": "GET",
      "path": "/api/v2/pokemon",
      "trigger": "load",
      "query": {
        "limit": {
          "$option": "limit"
        },
        "offset": {
          "$option": "offset"
        }
      },
      "auth": "inherit",
      "permission": "view"
    },
    "pokemonDetail": {
      "source": "default",
      "kind": "query",
      "method": "GET",
      "path": "/api/v2/pokemon/{param:name}",
      "trigger": "manual",
      "auth": "inherit",
      "permission": "view"
    }
  },
  "options": {
    "limit": {
      "label": "Loaded Pokémon",
      "control": "number",
      "default": 40,
      "min": 10,
      "max": 200,
      "step": 10
    },
    "offset": {
      "label": "List offset",
      "control": "number",
      "default": 0,
      "min": 0,
      "max": 1300,
      "step": 20
    }
  },
  "template": "<Stack gap=\"md\">\n  <Group justify=\"space-between\" align=\"center\" wrap=\"wrap\">\n    <Group gap=\"sm\" align=\"center\"><Icon name=\"star-filled\" /><Stack gap={0}><Text fw={700} size=\"lg\">Pokédex</Text><Text size=\"xs\" c=\"dimmed\">Explore Pokémon by name, type, and stats</Text></Stack></Group>\n    <Group gap=\"xs\"><Badge color=\"red\" variant=\"light\">{data.pokemonList?.count ?? 0} species</Badge><RefreshButton requestId=\"pokemonList\" label=\"Refresh list\" /></Group>\n  </Group>\n  <Stack gap=\"sm\">\n    <Group justify=\"space-between\" align=\"center\"><Text fw={600}>Browse loaded list</Text><Text size=\"xs\" c=\"dimmed\">{data.pokemonList?.results?.length ?? 0} loaded</Text></Group>\n    <Select bind=\"selectedName\" label=\"Search and choose a Pokémon\" placeholder=\"Type a name or select one\" searchable clearable nothingFoundMessage=\"No loaded Pokémon match\" data={(data.pokemonList?.results ?? []).map((pokemon) => pokemon.name)} />\n    <TextInput bind=\"directName\" label=\"Direct name lookup\" placeholder=\"Any Pokédex name, e.g. pikachu\" />\n  </Stack>\n  <Stack gap=\"sm\">\n    <Text fw={600}>Selected Pokémon</Text>\n    {inputs.selectedName ? <SubFetch requestId=\"pokemonDetail\" trigger=\"manual\" params={{name: inputs.selectedName}} loadingLabel=\"Loading selected Pokémon…\" errorMessage=\"Could not load this Pokémon. Try again.\" triggerAriaLabel=\"Load selected Pokémon details\" triggerContent={<Text c=\"red\" fw={600}>Open selected Pokémon</Text>}>\n      {(pokemon) => <Card withBorder radius=\"md\" p=\"md\"><Stack gap=\"sm\"><Group gap=\"sm\" align=\"center\">{pokemon.sprites?.other?.[\"official-artwork\"]?.front_default ? <Image src={pokemon.sprites.other[\"official-artwork\"].front_default} alt={pokemon.name} w={88} h={88} fit=\"contain\" /> : <Icon name=\"star-filled\" />}<Stack gap={0}><Text fw={700} tt=\"capitalize\">#{pokemon.id} {pokemon.name}</Text><Text size=\"sm\" c=\"dimmed\">Height {pokemon.height / 10} m · Weight {pokemon.weight / 10} kg</Text></Stack></Group><Group gap=\"xs\">{(pokemon.types ?? []).map((entry) => <Badge key={entry.slot} color=\"red\" variant=\"light\" tt=\"capitalize\">{entry.type.name}</Badge>)}</Group><Stack gap=\"xs\"><Text size=\"sm\" fw={600}>Abilities</Text><Group gap=\"xs\">{(pokemon.abilities ?? []).map((entry) => <Badge key={entry.ability.name} color=\"gray\" variant=\"outline\" tt=\"capitalize\">{entry.ability.name}{entry.is_hidden ? \" · hidden\" : \"\"}</Badge>)}</Group></Stack><Text size=\"sm\" fw={600}>Base stats</Text><Stack gap=\"xs\">{(pokemon.stats ?? []).map((entry) => <Stack key={entry.stat.name} gap={0}><Group justify=\"space-between\"><Text size=\"xs\" tt=\"capitalize\">{entry.stat.name}</Text><Text size=\"xs\">{entry.base_stat}</Text></Group><Progress value={Math.min((entry.base_stat / 255) * 100, 100)} color=\"red\" size=\"sm\" /></Stack>)}</Stack></Stack></Card>}\n    </SubFetch> : <Text size=\"sm\" c=\"dimmed\">Choose a Pokémon from the loaded list to see its details here.</Text>}\n  </Stack>\n  <Stack gap=\"sm\">\n    <Text fw={600}>Direct lookup result</Text>\n    {inputs.directName ? <SubFetch requestId=\"pokemonDetail\" trigger=\"manual\" params={{name: inputs.directName}} loadingLabel=\"Looking up Pokémon…\" errorMessage=\"No Pokémon found for that name. Check spelling and retry.\" triggerAriaLabel=\"Look up Pokémon by name\" triggerContent={<Text c=\"red\" fw={600}>Look up typed name</Text>}>\n      {(pokemon) => <Card withBorder radius=\"md\" p=\"md\"><Stack gap=\"sm\"><Group gap=\"sm\" align=\"center\">{pokemon.sprites?.other?.[\"official-artwork\"]?.front_default ? <Image src={pokemon.sprites.other[\"official-artwork\"].front_default} alt={pokemon.name} w={88} h={88} fit=\"contain\" /> : <Icon name=\"star-filled\" />}<Stack gap={0}><Text fw={700} tt=\"capitalize\">#{pokemon.id} {pokemon.name}</Text><Text size=\"sm\" c=\"dimmed\">Height {pokemon.height / 10} m · Weight {pokemon.weight / 10} kg</Text></Stack></Group><Group gap=\"xs\">{(pokemon.types ?? []).map((entry) => <Badge key={entry.slot} color=\"red\" variant=\"light\" tt=\"capitalize\">{entry.type.name}</Badge>)}</Group><Stack gap=\"xs\"><Text size=\"sm\" fw={600}>Abilities</Text><Group gap=\"xs\">{(pokemon.abilities ?? []).map((entry) => <Badge key={entry.ability.name} color=\"gray\" variant=\"outline\" tt=\"capitalize\">{entry.ability.name}{entry.is_hidden ? \" · hidden\" : \"\"}</Badge>)}</Group></Stack><Text size=\"sm\" fw={600}>Base stats</Text><Stack gap=\"xs\">{(pokemon.stats ?? []).map((entry) => <Stack key={entry.stat.name} gap={0}><Group justify=\"space-between\"><Text size=\"xs\" tt=\"capitalize\">{entry.stat.name}</Text><Text size=\"xs\">{entry.base_stat}</Text></Group><Progress value={Math.min((entry.base_stat / 255) * 100, 100)} color=\"red\" size=\"sm\" /></Stack>)}</Stack></Stack></Card>}\n    </SubFetch> : <Text size=\"sm\" c=\"dimmed\">Enter any Pokémon name above to begin a direct lookup.</Text>}\n  </Stack>\n  {status.pokemonList?.loading ? <Text size=\"sm\" c=\"dimmed\">Loading the Pokédex list…</Text> : null}\n  {status.pokemonList && !status.pokemonList.ok ? <Text size=\"sm\" c=\"red\">Could not load names ({status.pokemonList.statusText ?? status.pokemonList.status ?? \"request failed\"}). Refresh to retry.</Text> : null}\n  {data.pokemonList?.results && data.pokemonList.results.length === 0 ? <Text size=\"sm\" c=\"dimmed\">No Pokémon returned for this list range.</Text> : null}\n  {!data.pokemonList && !status.pokemonList?.loading && status.pokemonList?.ok !== false ? <Text size=\"sm\" c=\"dimmed\">Your Pokédex list will appear here once loaded.</Text> : null}\n</Stack>"
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

