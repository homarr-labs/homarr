import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

export interface BundledCustomWidget {
  id: "seed-dog-facts" | "seed-currency-exchange" | "seed-jellyfin" | "seed-pokedex";
  widget: HomarrCustomWidgetV2;
}

export const BUNDLED_CUSTOM_WIDGETS: readonly BundledCustomWidget[] = [
  {
    id: "seed-dog-facts",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Random Dog Fact",
      description: "Displays a random fun fact about dogs.",
      sources: [
        {
          id: "default",
          name: "Dog API",
          baseUrl: "https://dogapi.dog",
          networkScope: "public",
          auth: { type: "none" },
        },
      ],
      requests: [
        {
          id: "fact",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/api/v2/facts",
          parameters: {},
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
          cacheTtlSeconds: 30,
        },
      ],
      optionsSchema: { type: "object", properties: {}, additionalProperties: false },
      defaultOptions: {},
      template: `<Stack gap="sm" p="sm" h="100%" justify="center">
  <Group justify="space-between">
    <Text fw={700}>Dog fact</Text>
    <RefreshButton />
  </Group>
  {status.fact?.loading ? <Skeleton height={72} radius="md" /> :
    status.fact?.error ? <Alert color="red">{status.fact.error}</Alert> :
    <Text size="sm">{data.fact?.data?.[0]?.attributes?.body ?? "No dog fact was returned."}</Text>}
</Stack>`,
    },
  },
  {
    id: "seed-currency-exchange",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Currency Exchange",
      description: "Converts an amount using European Central Bank exchange rates.",
      sources: [
        {
          id: "default",
          name: "Frankfurter",
          baseUrl: "https://api.frankfurter.dev",
          networkScope: "public",
          auth: { type: "none" },
        },
      ],
      requests: [
        {
          id: "rates",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/v1/latest",
          parameters: { from: "string", to: "string", amount: "number" },
          optionsBinding: {
            from: { $option: "from" },
            to: { $option: "to" },
            amount: { $option: "amount" },
          },
          queryTemplate: {
            from: { $param: "from" },
            to: { $param: "to" },
            amount: { $param: "amount" },
          },
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
          cacheTtlSeconds: 300,
        },
      ],
      optionsSchema: {
        type: "object",
        properties: {
          from: { type: "string", title: "From currency", minLength: 3, maxLength: 3 },
          to: { type: "string", title: "Target currencies", description: "Comma-separated currency codes" },
          amount: { type: "number", title: "Amount", minimum: 0 },
        },
        required: ["from", "to", "amount"],
        additionalProperties: false,
      },
      defaultOptions: { from: "JPY", to: "EUR,USD", amount: 50 },
      template: `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={700}>{options.amount} {options.from}</Text><Badge>{data.rates?.date ?? "Latest"}</Badge></Group>
  {status.rates?.loading ? <Skeleton height={80} radius="md" /> : status.rates?.error ? <Alert color="red">{status.rates.error}</Alert> :
    <SimpleGrid cols={{ base: 1, xs: 2 }}>
      {Object.entries(data.rates?.rates ?? {}).map(entry => <Paper key={entry[0]} withBorder p="sm"><Text size="xs" c="dimmed">{entry[0]}</Text><Text fw={700} size="xl">{entry[1]}</Text></Paper>)}
    </SimpleGrid>}
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
      sources: [
        {
          id: "default",
          name: "Jellyfin",
          baseUrl: "http://jellyfin.local",
          networkScope: "private",
          auth: { type: "apiKeyHeader", headerName: "X-Emby-Token" },
        },
      ],
      requests: [
        {
          id: "counts",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/Items/Counts",
          parameters: {},
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
          cacheTtlSeconds: 60,
        },
      ],
      optionsSchema: { type: "object", properties: {}, additionalProperties: false },
      defaultOptions: {},
      template: `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={700}>Jellyfin library</Text><RefreshButton /></Group>
  {status.counts?.loading ? <Skeleton height={96} radius="md" /> : status.counts?.error ? <Alert color="red">{status.counts.error}</Alert> :
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      {[{ label: "Movies", value: data.counts?.MovieCount }, { label: "Series", value: data.counts?.SeriesCount }, { label: "Episodes", value: data.counts?.EpisodeCount }, { label: "Songs", value: data.counts?.SongCount }].map(item => <Paper key={item.label} withBorder p="sm"><Text size="xs" c="dimmed">{item.label}</Text><Text fw={700} size="xl">{item.value ?? 0}</Text></Paper>)}
    </SimpleGrid>}
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
      sources: [
        {
          id: "default",
          name: "PokeAPI",
          baseUrl: "https://pokeapi.co",
          networkScope: "public",
          auth: { type: "none" },
        },
      ],
      requests: [
        {
          id: "pokemon",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/api/v2/pokemon",
          parameters: { limit: "number" },
          optionsBinding: { limit: { $option: "limit" } },
          queryTemplate: { limit: { $param: "limit" }, offset: 0 },
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
          cacheTtlSeconds: 300,
        },
        {
          id: "detail",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/api/v2/pokemon/{name}",
          parameters: { name: "string" },
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "manual",
          cacheTtlSeconds: 300,
        },
      ],
      optionsSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            title: "Pokémon to load",
            minimum: 1,
            maximum: 100,
            "x-homarr": { control: "number" },
          },
        },
        required: ["limit"],
        additionalProperties: false,
      },
      defaultOptions: { limit: 20 },
      template: `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Title order={3}>Pokédex</Title><Badge color="red">{data.pokemon?.count ?? 0} Pokémon</Badge></Group>
  {status.pokemon?.loading ? <Skeleton height={180} radius="md" /> : status.pokemon?.error ? <Alert color="red">{status.pokemon.error}</Alert> :
    <Stack gap="xs">{(data.pokemon?.results ?? []).map((pokemon) => {
      const segments = pokemon.url.split("/").filter((part) => part);
      const dexId = segments.at(-1);
      return <Paper key={dexId} withBorder p="xs"><Group justify="space-between"><Group gap="xs"><Badge variant="light">#{dexId}</Badge><Text fw={600} tt="capitalize">{pokemon.name}</Text></Group><SubFetch requestId="detail" params={{ name: pokemon.name }} trigger="manual"><Stack gap="xs"><SubData path="sprites.front_default" as="Image" alt={pokemon.name} w={80} h={80} /><SubData path="name" as="Title" order={4} /><SubData path="types" as="Code" /></Stack></SubFetch></Group></Paper>;
    })}</Stack>}
</Stack>`,
    },
  },
] as const;
