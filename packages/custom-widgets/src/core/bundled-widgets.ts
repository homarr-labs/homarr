import type { HomarrCustomWidgetV2Input } from "./custom-jsx-schema";

export interface BundledCustomWidget {
  id: "seed-dog-facts" | "seed-currency-exchange" | "seed-jellyfin" | "seed-pokedex" | "seed-tautulli-activity";
  widget: HomarrCustomWidgetV2Input;
}

export const BUNDLED_CUSTOM_WIDGETS: readonly BundledCustomWidget[] = [
  {
    id: "seed-dog-facts",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Random Dog Fact",
      description: "Displays a random fun fact about dogs.",
      sources: { default: { name: "Dog API", baseUrl: "https://dogapi.dog", networkScope: "public", auth: "none" } },
      requests: { fact: { path: "/api/v2/facts", cacheSeconds: 30 } },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%" justify="center">
  <Group justify="space-between"><Text fw={700}>Dog fact</Text><RefreshButton /></Group>
  {status.fact?.loading ? <Skeleton height={72} radius="md" /> : status.fact?.error ? <Alert color="red">{status.fact.error}</Alert> : <Text size="sm">{data.fact?.data?.[0]?.attributes?.body ?? "No dog fact was returned."}</Text>}
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
      template: `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={700}>{options.amount} {options.from}</Text><Badge>{data.rates?.date ?? "Latest"}</Badge></Group>
  {status.rates?.loading ? <Skeleton height={80} radius="md" /> : status.rates?.error ? <Alert color="red">{status.rates.error}</Alert> : <SimpleGrid cols={{ base: 1, xs: 2 }}>{Object.entries(data.rates?.rates ?? {}).map(entry => <Paper key={entry[0]} withBorder p="sm"><Text size="xs" c="dimmed">{entry[0]}</Text><Text fw={700} size="xl">{entry[1]}</Text></Paper>)}</SimpleGrid>}
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
  {
    id: "seed-tautulli-activity",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Tautulli Activity",
      description: "Shows active Plex streams from Tautulli.",
      sources: {
        default: {
          name: "Tautulli API",
          baseUrl: "http://tautulli.local",
          networkScope: "private",
          auth: { type: "apiKeyQuery", name: "apikey" },
        },
      },
      requests: { activity: { path: "/api/v2", query: { cmd: "get_activity" }, cacheSeconds: 15 } },
      options: {},
      template: `<Stack gap="md" p="md">
  <Group justify="space-between"><Stack gap={2}><Text fw={700}>Tautulli Activity</Text><Text size="xs" c="dimmed">Live streaming sessions</Text></Stack><RefreshButton /></Group>
  {status.activity?.loading ? <Stack gap="sm"><Skeleton height={80} radius="md" /><Skeleton height={80} radius="md" /></Stack> : status.activity?.error ? <Alert color="red" title="Could not load activity">{status.activity.error}</Alert> : (data.activity?.response?.data?.sessions ?? []).length === 0 ? <Alert color="gray" title="No active streams">All quiet.</Alert> : <>
    <SimpleGrid cols={{ base: 2, xs: 4 }}>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Active streams</Text><Text size="xl" fw={700}>{(data.activity?.response?.data?.sessions ?? []).length}</Text></Paper>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Total bandwidth</Text><Text size="xl" fw={700}>{((data.activity?.response?.data?.sessions ?? []).reduce((sum, session) => sum + (session.bandwidth || 0), 0) / 1000000).toFixed(1)}<Text span size="xs" c="dimmed"> Mbps</Text></Text></Paper>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Direct play</Text><Text size="xl" fw={700}>{(data.activity?.response?.data?.sessions ?? []).filter(session => session.transcode_decision === "direct play" || session.transcode_decision === "copy").length}</Text></Paper>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Transcodes</Text><Text size="xl" fw={700}>{(data.activity?.response?.data?.sessions ?? []).filter(session => session.transcode_decision === "transcode").length}</Text></Paper>
    </SimpleGrid>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>{(data.activity?.response?.data?.sessions ?? []).map(session => <Paper key={session.session_key} withBorder p="sm" radius="md"><Stack gap="xs"><Group justify="space-between"><Group gap="xs"><Text size="sm" fw={600}>{session.user}</Text><Badge variant="light" color={session.state === "playing" ? "green" : session.state === "paused" ? "yellow" : "orange"}>{session.state}</Badge></Group><Badge variant="light" color="gray">{session.player}</Badge></Group><Text size="sm" lineClamp={1}>{session.full_title}</Text><Progress value={session.progress_percent} size="sm" color="blue" /><Group justify="space-between"><Group gap="xs"><Badge variant="light" color={session.transcode_decision === "transcode" ? "red" : session.transcode_decision === "copy" ? "orange" : "teal"}>{session.transcode_decision}</Badge><Badge variant="light" color="gray">{session.bandwidth ? (session.bandwidth / 1000000).toFixed(1) + " Mbps" : "—"}</Badge></Group><Badge variant="outline" color={session.location === "lan" ? "blue" : "yellow"}>{session.location}</Badge></Group></Stack></Paper>)}</SimpleGrid>
  </>}
</Stack>`,
    },
  },
] as const;
