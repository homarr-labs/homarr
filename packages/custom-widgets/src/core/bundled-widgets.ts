import type { HomarrCustomWidgetV2Input } from "./custom-jsx-schema";

export interface BundledCustomWidget {
  id: "seed-dog-facts" | "seed-currency-exchange" | "seed-jellyfin" | "seed-pokedex" | "seed-weather-outlook";
  widget: HomarrCustomWidgetV2Input;
}

export const BUNDLED_CUSTOM_WIDGETS: readonly BundledCustomWidget[] = [
  {
    id: "seed-weather-outlook",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Weather Outlook",
      description:
        "Current temperature, feels-like temperature, wind, and a five-day rain outlook. Set your coordinates in widget options.",
      sources: {
        default: { name: "Open-Meteo", baseUrl: "https://api.open-meteo.com", networkScope: "public", auth: "none" },
      },
      requests: {
        forecast: {
          path: "/v1/forecast",
          query: {
            latitude: { $option: "latitude" },
            longitude: { $option: "longitude" },
            current: "temperature_2m,apparent_temperature,wind_speed_10m",
            daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            timezone: "auto",
            forecast_days: 5,
            temperature_unit: { $option: "unit" },
          },
          cacheSeconds: 900,
        },
      },
      options: {
        location: { label: "Location label", control: "text", default: "Berlin" },
        latitude: { label: "Latitude", control: "number", default: 52.52, min: -90, max: 90, step: 0.01 },
        longitude: { label: "Longitude", control: "number", default: 13.41, min: -180, max: 180, step: 0.01 },
        unit: {
          label: "Temperature unit",
          control: "select",
          default: "celsius",
          choices: [
            { label: "Celsius", value: "celsius" },
            { label: "Fahrenheit", value: "fahrenheit" },
          ],
        },
      },
      template: `<Stack gap="sm" p="sm" h="100%" style={{ minWidth: 0, minHeight: 0 }}>
  <Group justify="space-between" wrap="nowrap"><Stack gap={2} style={{ minWidth: 0 }}><Text size="xs" c="dimmed" tt="uppercase" fw={700}>Weather outlook</Text><Title order={4} style={{ overflowWrap: "anywhere" }}>{options.location}</Title></Stack><RefreshButton requestId="forecast" label="Refresh weather" size="xs" /></Group>
  {status.forecast?.loading && <Skeleton height={180} radius="md" />}
  {status.forecast?.ok === false && <Alert color="red" title="Weather unavailable">{status.forecast.error || "Check your coordinates and try refreshing."}</Alert>}
  {!status.forecast?.loading && status.forecast?.ok !== false && <ScrollArea style={{ flex: 1, minHeight: 0 }}><Stack gap="sm">
    {data.forecast?.current?.temperature_2m == null && <Alert color="gray" title="No current weather">Refresh to request a new forecast.</Alert>}
    {data.forecast?.current?.temperature_2m != null && <Paper withBorder radius="md" p="md"><Group justify="space-between" align="center" gap="sm"><Text size="2.5rem" fw={750} lh={1.1}>{Math.round(data.forecast.current.temperature_2m)}<Text span size="xl" c="dimmed">{data.forecast.current_units?.temperature_2m}</Text></Text><Stack gap={4}><Text size="sm">Feels like {data.forecast.current.apparent_temperature ?? "—"}{data.forecast.current_units?.apparent_temperature}</Text><Text size="sm" c="dimmed">Wind {data.forecast.current.wind_speed_10m ?? "—"} {data.forecast.current_units?.wind_speed_10m}</Text></Stack></Group></Paper>}
    {(data.forecast?.daily?.time ?? []).length > 0 && <Stack gap={0}>{data.forecast.daily.time.map((day, index) => <Box key={day} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Group justify="space-between" gap="xs"><Text size="sm" fw={600}>{day.slice(5)}</Text><Group gap="xs"><Text size="xs" c="blue">Rain {data.forecast.daily.precipitation_probability_max?.[index] ?? "—"}%</Text><Text size="sm"><Text span c="dimmed">{data.forecast.daily.temperature_2m_min?.[index] ?? "—"}°</Text> / {data.forecast.daily.temperature_2m_max?.[index] ?? "—"}°</Text></Group></Group></Box>)}</Stack>}
    <Group justify="space-between" gap="xs"><Text size="xs" c="dimmed">Local dates · {data.forecast?.timezone || "Location timezone"}</Text><Anchor href="https://open-meteo.com/" target="_blank" rel="noreferrer" size="xs">Open-Meteo</Anchor></Group>
  </Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-dog-facts",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Random Dog Fact",
      description: "Displays a random fun fact about dogs.",
      sources: { default: { name: "Dog API", baseUrl: "https://dogapi.dog", networkScope: "public", auth: "none" } },
      requests: { fact: { path: "/api/v2/facts", cacheSeconds: 30 } },
      options: {},
      template: `<Stack gap="md" p="sm" h="100%" justify="center" style={{ minWidth: 0 }}>
  <Group justify="space-between" wrap="nowrap"><Group gap="xs"><ThemeIcon color="teal" variant="light" radius="xl" size="lg"><Icon name="heart" size={20} /></ThemeIcon><Text size="xs" fw={700} tt="uppercase" c="dimmed">A little dog knowledge</Text></Group><RefreshButton requestId="fact" label="Another dog fact" size="xs" /></Group>
  {status.fact?.loading && <Skeleton height={96} radius="md" />}
  {status.fact?.ok === false && <Alert color="red" title="Fact unavailable">Try refreshing in a moment.</Alert>}
  {!status.fact?.loading && status.fact?.ok !== false && <Paper withBorder radius="md" p="lg"><Text size="lg" fw={500} lh={1.65} style={{ overflowWrap: "anywhere" }}>{data.fact?.data?.[0]?.attributes?.body || "No fact returned. Try another."}</Text><Text size="xs" c="dimmed" mt="md">Dog API · Something new to learn</Text></Paper>}
</Stack>`,
    },
  },
  {
    id: "seed-currency-exchange",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Currency Exchange",
      description: "Converts an amount using European Central Bank exchange rates.",
      sources: {
        default: { name: "Frankfurter", baseUrl: "https://api.frankfurter.dev", networkScope: "public", auth: "none" },
      },
      requests: {
        rates: {
          path: "/v1/latest",
          query: { from: { $option: "from" }, to: { $option: "to" }, amount: { $option: "amount" } },
          cacheSeconds: 300,
        },
      },
      options: {
        from: { label: "From currency", control: "text", default: "JPY" },
        to: {
          label: "Target currencies",
          description: "Comma-separated currency codes",
          control: "text",
          default: "EUR,USD",
        },
        amount: { label: "Amount", control: "number", default: 50, min: 0 },
      },
      template: `<Stack gap="sm" p="sm" h="100%" style={{ minWidth: 0, minHeight: 0 }}>
  <Group justify="space-between" wrap="nowrap"><Stack gap={2}><Text size="xs" c="dimmed" tt="uppercase" fw={700}>Currency exchange</Text><Title order={3}>{options.amount} {options.from}</Title></Stack><RefreshButton requestId="rates" label="Refresh exchange rates" size="xs" /></Group>
  {status.rates?.loading && <Skeleton height={100} radius="md" />}
  {status.rates?.ok === false && <Alert color="red" title="Rates unavailable">{status.rates.error || "Check the currency codes in widget options, then refresh."}</Alert>}
  {!status.rates?.loading && status.rates?.ok !== false && <ScrollArea style={{ flex: 1, minHeight: 0 }}><Stack gap="sm">
    {Object.entries(data.rates?.rates ?? {}).length === 0 && <Alert color="gray" title="No exchange rates">Choose supported target currencies in widget options.</Alert>}
    <SimpleGrid type="container" cols={{ base: 1, "300px": 2 }} spacing="xs">{Object.entries(data.rates?.rates ?? {}).map(entry => <Paper key={entry[0]} withBorder radius="md" p="md"><Group justify="space-between"><Badge variant="light" color="blue">{entry[0]}</Badge><Text size="xs" c="dimmed">Converted amount</Text></Group><Text fw={750} size="1.75rem" mt="sm" style={{ overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{Number(entry[1]).toFixed(2)}</Text></Paper>)}</SimpleGrid>
    <Text size="xs" c="dimmed">ECB reference rates · {data.rates?.date || "Date unavailable"} · Not a live trading quote</Text>
  </Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-jellyfin",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Jellyfin Library",
      description: "Counts movies, series, episodes, and songs in a Jellyfin library.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
      sources: {
        default: {
          name: "Jellyfin",
          baseUrl: "http://jellyfin.local",
          networkScope: "private",
          auth: { type: "apiKeyHeader", name: "X-Emby-Token" },
        },
      },
      requests: { counts: { path: "/Items/Counts", cacheSeconds: 60 } },
      options: {},
      template: `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={700}>Jellyfin library</Text><RefreshButton /></Group>
  {status.counts?.loading ? <Skeleton height={96} radius="md" /> : status.counts?.error ? <Alert color="red">{status.counts.error}</Alert> : <SimpleGrid cols={{ base: 2, sm: 4 }}>{[{ label: "Movies", value: data.counts?.MovieCount }, { label: "Series", value: data.counts?.SeriesCount }, { label: "Episodes", value: data.counts?.EpisodeCount }, { label: "Songs", value: data.counts?.SongCount }].map(item => <Paper key={item.label} withBorder p="sm"><Text size="xs" c="dimmed">{item.label}</Text><Text fw={700} size="xl">{item.value ?? 0}</Text></Paper>)}</SimpleGrid>}
</Stack>`,
    },
  },
  {
    id: "seed-pokedex",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Pokédex",
      description: "Browse Pokémon and open a responsive detail view.",
      iconUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
      sources: { default: { name: "PokeAPI", baseUrl: "https://pokeapi.co", networkScope: "public", auth: "none" } },
      requests: {
        pokemon: {
          path: "/api/v2/pokemon",
          query: { limit: { $option: "limit" }, offset: { $option: "offset" } },
          cacheSeconds: 300,
        },
        detail: { path: "/api/v2/pokemon/{param:name}", trigger: "manual", cacheSeconds: 300 },
      },
      options: {
        limit: { label: "Pokémon to load", control: "number", default: 24, min: 1, max: 100 },
        offset: { label: "Start at Pokédex number", control: "number", default: 0, min: 0, advanced: true },
        accent: { label: "Accent color", control: "color", default: "red" },
      },
      template: `<Stack gap="md" p="md" h="100%">
  <Group justify="space-between" align="flex-start">
    <Stack gap={2}><Group gap="xs"><ThemeIcon color={options.accent} variant="light" radius="xl"><Icon name="pokeball" /></ThemeIcon><Title order={3}>Pokédex</Title></Group><Text size="xs" c="dimmed">Explore species, types, abilities, and base stats</Text></Stack>
    <Group gap="xs"><Badge color={options.accent} variant="light">{data.pokemon?.count?.toLocaleString() ?? "—"} species</Badge><RefreshButton /></Group>
  </Group>
  <TextInput bind="search" label="Filter loaded Pokémon" placeholder="Search by name…" />
  {status.pokemon?.loading ? <Stack gap="xs">{[1, 2, 3, 4].map(item => <Skeleton key={item} height={82} radius="md" />)}</Stack> : status.pokemon?.error ? <Alert color="red" title="The Pokédex could not be loaded">{status.pokemon.error}</Alert> : (data.pokemon?.results ?? []).filter(pokemon => pokemon.name.toLowerCase().includes(String(inputs.search ?? "").toLowerCase())).length === 0 ? <Alert color="gray" title="No Pokémon found">Try another name or increase the result limit in widget options.</Alert> : <ScrollArea h={390} type="auto"><PaginatedList pageSize={8}>{(data.pokemon?.results ?? []).filter(pokemon => pokemon.name.toLowerCase().includes(String(inputs.search ?? "").toLowerCase())).map(pokemon => <SubFetch key={pokemon.name} requestId="detail" params={{ name: pokemon.name }} trigger="manual" triggerAriaLabel={"Open details for " + pokemon.name} loadingLabel="Loading Pokémon…" fallback={<Card withBorder radius="md" p="xs" mb="xs"><Skeleton height={64} radius="sm" /></Card>} triggerContent={<Card withBorder radius="md" p="xs" mb="xs"><Group wrap="nowrap" justify="space-between"><Group wrap="nowrap" gap="sm"><Image src={"https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/" + pokemon.url.split("/").slice(-2, -1)[0] + ".png"} alt={pokemon.name} w={64} h={64} fit="contain" radius="sm" fallbackSrc="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png" /><Stack gap={0}><Text fw={700} tt="capitalize">{pokemon.name}</Text><Text size="xs" c="dimmed">#{String(pokemon.url.split("/").slice(-2, -1)[0]).padStart(3, "0")}</Text></Stack></Group><Badge color={options.accent} variant="light">Details</Badge></Group></Card>}>{(detail) => <Card withBorder radius="md" p="sm" mb="xs"><Stack gap="sm"><Group align="flex-start" wrap="nowrap"><Image src={"https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/" + detail.id + ".png"} alt={detail.name} w={80} h={80} fit="contain" radius="md" fallbackSrc="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png" /><Stack gap="xs" style={{ flex: 1 }}><Group justify="space-between"><Text fw={750} size="lg" tt="capitalize">{detail.name}</Text><Group gap={6}>{(detail.types ?? []).map(type => <Badge key={type.type?.name} variant="light" tt="capitalize">{type.type?.name}</Badge>)}</Group></Group><Text size="xs" c="dimmed">Height {detail.height / 10} m · Weight {detail.weight / 10} kg</Text><Text size="xs"><Text span fw={600}>Abilities: </Text>{(detail.abilities ?? []).map(ability => ability.ability?.name?.replace("-", " ")).join(", ")}</Text></Stack></Group><Divider /><SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">{(detail.stats ?? []).map(stat => <Stack key={stat.stat?.name} gap={3}><Group justify="space-between"><Text size="xs" tt="capitalize">{stat.stat?.name?.replace("-", " ")}</Text><Text size="xs" fw={700}>{stat.base_stat}</Text></Group><Progress value={Math.min(100, stat.base_stat / 2)} color={options.accent} size="sm" /></Stack>)}</SimpleGrid></Stack></Card>}</SubFetch>)}</PaginatedList></ScrollArea>}
</Stack>`,
    },
  },
] as const;
