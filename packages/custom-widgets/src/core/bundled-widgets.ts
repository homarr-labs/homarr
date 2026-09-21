import type { HomarrCustomWidgetV2Input } from "./custom-jsx-schema";

export interface BundledCustomWidget {
  id:
    | "seed-dog-facts"
    | "seed-currency-exchange"
    | "seed-jellyfin"
    | "seed-pokedex"
    | "seed-tautulli-activity"
    | "seed-dispatcharr-channels"
    | "seed-karakeep-bookmarks"
    | "seed-mealie-today"
    | "seed-romm-library"
    | "seed-tubearchivist-queue"
    | "seed-frigate-alerts"
    | "seed-frigate-system"
    | "seed-frigate-live-streams";
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
  {
    id: "seed-dispatcharr-channels",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Dispatcharr Channels",
      description: "Shows a bounded Dispatcharr channel lineup with EPG and catch-up state.",
      sources: {
        default: {
          name: "Dispatcharr",
          baseUrl: "https://your-service.example.com",
          networkScope: "private",
          auth: { type: "apiKeyHeader", name: "X-API-Key" },
        },
      },
      requests: {
        channels: {
          path: "/api/channels/channels/",
          query: { page: 1, page_size: 12, ordering: "channel_number" },
          cacheSeconds: 30,
        },
      },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%" style={{ minHeight: 0 }}>
  <Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0} style={{ minWidth: 0, flex: 1 }}><Title order={3}>Dispatcharr channels</Title><Text size="xs" c="dimmed">Live output lineup</Text></Stack><RefreshButton requestId="channels" /></Group>
  <Paper withBorder p="sm" radius="md">{status.channels?.loading ? <Group gap="sm"><Skeleton height={28} width={48} radius="sm" /><Stack gap={3} style={{ flex: 1 }}><Skeleton height={12} width="55%" radius="sm" /><Skeleton height={10} width="75%" radius="sm" /></Stack></Group> : status.channels?.error ? <Stack gap={0}><Text size="sm" fw={700}>Channel totals unavailable</Text><Text size="xs" c="dimmed">First page could not be loaded</Text></Stack> : !data.channels ? <Text size="sm" c="dimmed">Waiting for first-page channel data…</Text> : (data.channels?.count ?? (data.channels?.results ?? []).length) === 0 ? <Stack gap={0}><Text size="sm" fw={700}>No configured channels</Text><Text size="xs" c="dimmed">First page · ordered by channel number</Text></Stack> : <Group justify="space-between" align="center" wrap="wrap"><Group gap="xs" align="baseline"><Text size="xl" fw={800} lh={1}>{Math.min((data.channels?.results ?? []).length, 12)}</Text><Text size="sm" fw={650}>shown</Text></Group><Stack gap={0}><Text size="sm" fw={700}>of {data.channels?.count ?? (data.channels?.results ?? []).length} total channels</Text><Text size="xs" c="dimmed">First page · ordered by channel number</Text></Stack></Group>}</Paper>
  {status.channels?.loading ? <Stack gap={0}><Skeleton height={58} radius={0} /><Skeleton height={58} radius={0} /><Skeleton height={58} radius={0} /></Stack> : status.channels?.error ? <Alert color="red" title="Could not load channels">{status.channels.error}</Alert> : (data.channels?.results ?? []).length === 0 ? <Alert color="gray" title="No channels">Dispatcharr returned an empty lineup.</Alert> : <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}><Stack gap={0}>{(data.channels?.results ?? []).slice(0, 12).map(channel => <Box key={channel.uuid ?? channel.id} py="xs" px={4} style={{ borderBottom: "1px solid var(--mantine-color-default-border)", minWidth: 0 }}><Group gap="sm" wrap="nowrap" align="flex-start"><Text fw={800} size="lg" w={48} ta="right" style={{ flexShrink: 0 }}>{channel.effective_channel_number ?? channel.channel_number ?? "—"}</Text><Stack gap={3} style={{ minWidth: 0, flex: 1 }}><Text fw={700} lineClamp={1}>{channel.effective_name ?? channel.name ?? "Unnamed channel"}</Text><Text size="xs" c="dimmed" lineClamp={1}>Group {channel.effective_channel_group_id ?? channel.channel_group_id ?? "unassigned"} · {(channel.effective_epg_data_id ?? channel.epg_data_id) != null ? "EPG " + (channel.effective_epg_data_id ?? channel.epg_data_id) : "EPG unassigned"}</Text><Group gap={4} wrap="wrap"><Badge size="xs" color={channel.hidden_from_output ? "gray" : "green"} variant="light">{channel.hidden_from_output ? "Hidden from output" : "Visible in output"}</Badge><Badge size="xs" color={channel.is_catchup ? "blue" : "gray"} variant="light">{channel.is_catchup ? (channel.catchup_days ?? 0) + "d catch-up" : "Catch-up off"}</Badge></Group></Stack></Group></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-karakeep-bookmarks",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Karakeep Recent Bookmarks",
      description: "Shows recent unarchived Karakeep bookmarks with safe content fallbacks.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/karakeep.svg",
      sources: { default: { type: "integration", name: "Karakeep", integrationKind: "karakeep" } },
      requests: {
        bookmarks: {
          path: "/api/v1/bookmarks",
          query: { archived: false, sortOrder: "desc", limit: 8, includeContent: false },
          cacheSeconds: 30,
        },
      },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%" style={{ minHeight: 0 }}>
  <Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0} style={{ minWidth: 0, flex: 1 }}><Title order={4}>Recent bookmarks</Title><Text size="xs" c="dimmed">{status.bookmarks?.loading ? "Loading newest unarchived items…" : status.bookmarks?.error ? "Bookmarks unavailable" : !data.bookmarks ? "Waiting for the first response…" : data.bookmarks.nextCursor ? "Showing 8 newest · more available" : "Newest unarchived items"}</Text></Stack><Group gap="xs" wrap="wrap">{status.bookmarks?.loading ? <Badge variant="light">Loading</Badge> : status.bookmarks?.error ? <Badge color="red" variant="light">Unavailable</Badge> : !data.bookmarks ? <Badge color="gray" variant="light">Waiting</Badge> : <Badge variant="light">{Math.min((data.bookmarks.bookmarks ?? []).length, 8)} shown</Badge>}<RefreshButton requestId="bookmarks" /></Group></Group>
  {status.bookmarks?.loading ? <Stack gap="xs"><Text size="xs" c="dimmed">Loading bookmarks…</Text><Stack gap={0}><Skeleton height={94} radius={0} /><Skeleton height={94} radius={0} /></Stack></Stack> : status.bookmarks?.error ? <Alert color="red" title="Could not load bookmarks">{status.bookmarks.error}</Alert> : !data.bookmarks ? <Stack gap="xs"><Text size="sm" fw={600}>Waiting for bookmarks…</Text><Skeleton height={94} radius={0} /></Stack> : (data.bookmarks.bookmarks ?? []).length === 0 ? <Alert color="gray" title="No bookmarks">No unarchived bookmarks were returned.</Alert> : <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}><Stack gap={0}>{(data.bookmarks.bookmarks ?? []).slice(0, 8).map(bookmark => <Box key={bookmark.id} py="xs" px={4} style={{ borderBottom: "1px solid var(--mantine-color-default-border)", minWidth: 0 }}><Stack gap={5}>{bookmark.content?.url || bookmark.content?.sourceUrl ? <Anchor href={bookmark.content?.url || bookmark.content?.sourceUrl} target="_blank" rel="noreferrer" size="sm" fw={700} underline="hover" lineClamp={2} style={{ overflowWrap: "anywhere" }}>{bookmark.title || bookmark.content?.title || bookmark.content?.text || (bookmark.content?.type === "link" ? bookmark.content?.url || "Untitled link" : bookmark.content?.type === "text" ? "Text bookmark" : bookmark.content?.type === "asset" ? String(bookmark.content?.assetType || "Asset").toUpperCase() + " bookmark" : "Unknown bookmark")}</Anchor> : <Text size="sm" fw={700} lineClamp={2} style={{ overflowWrap: "anywhere" }}>{bookmark.title || bookmark.content?.title || bookmark.content?.text || (bookmark.content?.type === "link" ? "Untitled link" : bookmark.content?.type === "text" ? "Text bookmark" : bookmark.content?.type === "asset" ? String(bookmark.content?.assetType || "Asset").toUpperCase() + " bookmark" : "Unknown bookmark")}</Text>}<Text size="xs" c="dimmed" lineClamp={2} style={{ overflowWrap: "anywhere" }}>{bookmark.summary || bookmark.note || (bookmark.content?.type === "text" ? "Saved text" : bookmark.content?.type === "link" ? "Saved link" : bookmark.content?.type === "asset" ? "Stored " + (bookmark.content?.assetType || "asset") : "No summary or note")}</Text><Group gap="xs" wrap="wrap"><Badge size="xs" color={bookmark.content?.type === "link" ? "blue" : bookmark.content?.type === "text" ? "teal" : bookmark.content?.type === "asset" ? "grape" : "gray"} variant="light" tt="capitalize">{bookmark.content?.type || "unknown"}</Badge>{bookmark.favourited ? <Badge size="xs" color="yellow" variant="light">Favorite</Badge> : null}{(bookmark.tags ?? []).slice(0, 3).map(tag => <Badge key={tag.id || tag.name} size="xs" variant="outline">{tag.name || "Unnamed tag"}</Badge>)}{(bookmark.tags ?? []).length > 3 ? <Text size="xs" c="dimmed">+{(bookmark.tags ?? []).length - 3} more</Text> : null}</Group>{bookmark.content?.type === "unknown" || !bookmark.content?.type ? <Text size="xs" c="dimmed">Source metadata unavailable</Text> : null}</Stack></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-mealie-today",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Mealie Today",
      description: "Shows today's recipe-backed and text-only Mealie plan entries.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/mealie.svg",
      sources: { default: { type: "integration", name: "Mealie", integrationKind: "mealie" } },
      requests: { meals: { path: "/api/households/mealplans/today", cacheSeconds: 60 } },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%">
  <Group justify="space-between" align="flex-start"><Stack gap={0}><Title order={4}>Today's meals</Title><Text size="xs" c="dimmed">{status.meals?.loading ? "Loading plan…" : status.meals?.error ? "Plan unavailable" : (data.meals?.[0]?.date ? data.meals[0].date + " · " : "") + (data.meals ?? []).length + " planned"}</Text></Stack><RefreshButton requestId="meals" label="Refresh today's meals" size="xs" /></Group>
  {status.meals?.loading ? <Stack gap="xs"><Skeleton height={76} radius="md" /><Skeleton height={76} radius="md" /></Stack> : status.meals?.error ? <Alert color="red" title="Could not load today's plan">{status.meals.error}</Alert> : (data.meals ?? []).length === 0 ? <Alert color="gray" title="Nothing planned">Today's meal plan is empty.</Alert> : <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto"><Stack gap={0}>{(data.meals ?? []).map(meal => <Box key={meal.id} py="sm" px="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)", minWidth: 0 }}><Stack gap={6}><Badge size="sm" color="blue" variant="light" tt="capitalize" style={{ alignSelf: "flex-start" }}>{String(meal.entryType || "meal").replaceAll("_", " ")}</Badge><Text size="lg" fw={750} style={{ overflowWrap: "anywhere" }}>{meal.recipe?.name || meal.title || meal.text || "Untitled meal"}</Text><Group gap={6} wrap="wrap"><Text size="xs" c={meal.recipe ? "teal" : "dimmed"} fw={700}>{meal.recipe ? "Recipe" : "Plan note"}</Text>{meal.recipe ? <Text size="xs" c="dimmed">· {meal.recipe.recipeServings != null ? meal.recipe.recipeServings + " " + (meal.recipe.recipeYield || "servings") : "Servings not set"}</Text> : <Text size="xs" c="dimmed">· No recipe linked</Text>}{meal.recipe?.totalTime ? <Text size="xs" c="dimmed">· {meal.recipe.totalTime}</Text> : null}{meal.recipe?.rating != null ? <Text size="xs" c="dimmed">· Rating {meal.recipe.rating}</Text> : null}</Group>{meal.text && meal.text !== (meal.recipe?.name || meal.title || meal.text || "Untitled meal") ? <Text size="sm" style={{ overflowWrap: "anywhere" }}>{meal.text}</Text> : null}</Stack></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-romm-library",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "RomM Library Overview",
      description: "Combines RomM library totals with a bounded list of recently added games.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/romm.svg",
      sources: { default: { type: "integration", name: "RomM", integrationKind: "romm" } },
      requests: {
        stats: { path: "/api/stats", cacheSeconds: 120 },
        recent: {
          path: "/api/roms",
          query: {
            limit: 6,
            offset: 0,
            order_by: "created_at",
            order_dir: "desc",
            with_char_index: false,
            with_filter_values: false,
            with_rom_id_index: false,
            with_total: false,
          },
          cacheSeconds: 60,
        },
      },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%">
  <Group justify="space-between" align="flex-start"><Stack gap={0}><Title order={4}>RomM library</Title><Text size="xs" c="dimmed">Collection totals and latest additions</Text></Stack><RefreshButton requestId="stats" label="Refresh library totals" size="xs" /></Group>
  {status.stats?.loading ? <Skeleton height={112} radius="md" /> : status.stats?.error ? <Alert color="red" title="Library totals unavailable">{status.stats.error}</Alert> : data.stats?.PLATFORMS == null && data.stats?.ROMS == null && data.stats?.SAVES == null && data.stats?.STATES == null ? <Alert color="gray" title="No library totals">RomM returned no platform, ROM, save, or state counts.</Alert> : <Paper withBorder p="sm" radius="md"><SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm"><Stack gap={0}><Text size="xs" c="dimmed" fw={700} tt="uppercase">ROM collection</Text><Title order={2}>{data.stats?.ROMS ?? "—"}</Title></Stack><SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs"><Stack gap={0}><Text size="xs" c="dimmed">Platforms</Text><Text fw={700}>{data.stats?.PLATFORMS ?? "—"}</Text></Stack><Stack gap={0}><Text size="xs" c="dimmed">Saves</Text><Text fw={700}>{data.stats?.SAVES ?? "—"}</Text></Stack><Stack gap={0}><Text size="xs" c="dimmed">States</Text><Text fw={700}>{data.stats?.STATES ?? "—"}</Text></Stack></SimpleGrid></SimpleGrid></Paper>}
  <Divider />
  <Group justify="space-between"><Title order={5}>Recently added</Title><RefreshButton requestId="recent" label="Refresh recent games" size="xs" /></Group>
  {status.recent?.loading ? <Stack gap="xs"><Skeleton height={54} radius="md" /><Skeleton height={54} radius="md" /></Stack> : status.recent?.error ? <Alert color="red" title="Recent games unavailable">{status.recent.error}</Alert> : (data.recent?.items ?? []).length === 0 ? <Alert color="gray" title="No games">RomM returned no recent games.</Alert> : <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto"><Stack gap={0}>{(data.recent?.items ?? []).slice(0, 6).map(game => <Box key={game.id} py={6} style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Group justify="space-between" align="flex-start" wrap="wrap" gap="xs"><Stack gap={1} style={{ minWidth: 0, flex: 1 }}><Text size="sm" fw={700} style={{ overflowWrap: "anywhere" }}>{game.name || game.fs_name_no_ext || "Unnamed game"}</Text><Group gap={6} wrap="wrap"><Text size="xs" c="dimmed">{game.platform_display_name || "Unknown platform"}</Text>{game.created_at ? <Text size="xs" c="dimmed">· {Date.toLocaleString(game.created_at, "en-US", "UTC")} UTC</Text> : null}</Group></Stack>{game.missing_from_fs == null ? <Badge size="xs" color="gray" variant="light">Unknown</Badge> : game.missing_from_fs ? <Badge size="xs" color="red" variant="light">Missing</Badge> : <Badge size="xs" color="green" variant="light">Available</Badge>}</Group></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-tubearchivist-queue",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "TubeArchivist Queue Health",
      description: "Shows channel and pending-download health from TubeArchivist.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tube-archivist.png",
      sources: { default: { type: "integration", name: "TubeArchivist", integrationKind: "tubearchivist" } },
      requests: {
        channels: { path: "/api/stats/channel/", cacheSeconds: 120 },
        downloads: { path: "/api/stats/download/", cacheSeconds: 30 },
        queue: { path: "/api/download/", query: { filter: "pending", page: 0 }, cacheSeconds: 30 },
      },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%">
  <Group justify="space-between" align="flex-start" wrap="wrap"><Group gap="xs" align="flex-start"><Stack gap={0}><Title order={4}>TubeArchivist queue</Title><Text size="xs" c="dimmed">{status.queue?.loading ? "Loading pending downloads…" : status.queue?.error ? "Queue unavailable" : "First page of pending downloads"}</Text></Stack><RefreshButton requestId="queue" label="Refresh queue" size="xs" /></Group><Group gap="xs" align="flex-end"><Stack gap={0} align="flex-end"><Text size="xs" c="dimmed" fw={700} tt="uppercase">Pending</Text><Title order={2}>{status.downloads?.loading ? "…" : status.downloads?.error ? "—" : data.downloads?.pending ?? "—"}</Title></Stack><RefreshButton requestId="downloads" label="Refresh download counts" size="xs" /></Group></Group>
  {status.queue?.loading ? <Stack gap="xs"><Skeleton height={60} radius="md" /><Skeleton height={60} radius="md" /></Stack> : status.queue?.error ? <Alert color="red" title="Queue unavailable">{status.queue.error}</Alert> : (data.queue?.data ?? []).length === 0 ? <Alert color="gray" title="Queue is clear">No pending downloads.</Alert> : <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto"><Stack gap={0}>{(data.queue?.data ?? []).map(item => <Box key={item.youtube_id} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Stack gap={4}><Group justify="space-between" align="flex-start" wrap="nowrap"><Text fw={700} style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.title || item.youtube_id || "Untitled download"}</Text><Badge size="xs" color={item.status === "pending" ? "blue" : "gray"} variant="light">{String(item.status || "pending").replaceAll("_", " ")}</Badge></Group><Group gap="xs" wrap="wrap"><Badge size="xs" color="gray" variant="outline" tt="capitalize">{String(item.vid_type || "video").replaceAll("_", " ")}</Badge><Text size="xs" c="dimmed">{item.channel_name || "Unknown channel"}</Text><Text size="xs" c="dimmed">· {item.duration || "Unknown duration"}</Text></Group><Text size="xs" c={item.message ? "orange" : "dimmed"} style={{ overflowWrap: "anywhere" }}>{item.message || "No queue message"}</Text></Stack></Box>)}</Stack></ScrollArea>}
  {data.queue?.paginate ? <Text size="xs" c="dimmed">Showing {(data.queue.data ?? []).length} of {data.queue.paginate.total_hits ?? (data.queue.data ?? []).length} pending · page {(data.queue.paginate.current_page ?? 0) + 1} of {(data.queue.paginate.last_page ?? 0) + 1}</Text> : null}
  <Divider />
  <Group justify="space-between"><Text size="sm" fw={650}>Pending breakdown</Text><RefreshButton requestId="channels" label="Refresh channel counts" size="xs" /></Group>
  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs"><Box><Text size="xs" c="dimmed">Pending videos / shorts</Text><Text fw={700}>{status.downloads?.loading ? "…" : (data.downloads?.pending_videos ?? "Not reported") + " / " + (data.downloads?.pending_shorts ?? "Not reported")}</Text></Box><Box><Text size="xs" c="dimmed">Pending streams</Text><Text fw={700}>{status.downloads?.loading ? "…" : data.downloads?.pending_streams ?? "Not reported"}</Text></Box><Box><Text size="xs" c="dimmed">Channels</Text><Text fw={700}>{status.channels?.loading ? "…" : data.channels?.doc_count ?? "—"}</Text><Text size="xs" c="dimmed">{status.channels?.loading ? "Loading…" : (data.channels?.active_true ?? "—") + " active · " + (data.channels?.active_false ?? "—") + " inactive"}</Text></Box><Box><Text size="xs" c="dimmed">Subscribed</Text><Text fw={700}>{status.channels?.loading ? "…" : data.channels?.subscribed_true ?? "—"}</Text></Box><Box><Text size="xs" c="dimmed">Unsubscribed</Text><Text fw={700}>{status.channels?.loading ? "…" : data.channels?.subscribed_false ?? "—"}</Text></Box></SimpleGrid>
  {status.channels?.error ? <Alert color="red" title="Channel statistics unavailable">{status.channels.error}</Alert> : null}{status.downloads?.error ? <Alert color="red" title="Download statistics unavailable">{status.downloads.error}</Alert> : null}
</Stack>`,
    },
  },
  {
    id: "seed-frigate-alerts",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Frigate Review Alerts",
      description: "Shows recent unreviewed Frigate alerts without exposing protected media URLs.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/frigate.svg",
      sources: { default: { type: "integration", name: "Frigate", integrationKind: "frigate" } },
      requests: {
        alerts: {
          path: "/api/review",
          query: { reviewed: 0, severity: "alert", limit: 10 },
          cacheSeconds: 15,
        },
      },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%" style={{ minHeight: 0 }}>
  <Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0}><Text fw={700}>Frigate alerts</Text><Text size="xs" c="dimmed">Unreviewed alerts · last 24 hours</Text></Stack><RefreshButton requestId="alerts" label="Refresh alerts" /></Group>
  {status.alerts?.loading ? <Stack gap="xs"><Skeleton height={72} radius="md" /><Skeleton height={72} radius="md" /></Stack> : status.alerts?.error ? <Alert color="red" title="Could not load review alerts">{status.alerts.error}</Alert> : (data.alerts ?? []).filter(alert => alert.start_time >= Math.floor(Date.now() / 1000) - 86400).length === 0 ? <Alert color="green" title="All clear">No recent unreviewed alerts.</Alert> : <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}><Stack gap={0}>{(data.alerts ?? []).filter(alert => alert.start_time >= Math.floor(Date.now() / 1000) - 86400).sort((left, right) => Number(left.end_time != null) - Number(right.end_time != null)).map(alert => <Box key={alert.id} py="xs" px="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)", borderLeft: alert.end_time == null ? "3px solid var(--mantine-color-red-6)" : "3px solid transparent" }}><Stack gap={5}><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0} style={{ minWidth: 0, flex: 1 }}><Text fw={700} tt="capitalize" style={{ overflowWrap: "anywhere" }}>{String(alert.camera ?? "Unknown camera").replaceAll("_", " ")}</Text><Text size="xs" c="dimmed">{alert.start_time != null ? Date.toLocaleString(alert.start_time * 1000, "en-US") : "Start time unavailable"} · {alert.has_been_reviewed ? "Reviewed" : "Unreviewed"}</Text></Stack><Group gap={4} wrap="wrap"><Badge size="xs" color="gray" variant="outline" tt="capitalize">{String(alert.severity ?? "unknown").replaceAll("_", " ")}</Badge><Badge size="xs" color={alert.end_time == null ? "red" : "orange"} variant="light">{alert.end_time == null ? "Active alert" : "Ended alert"}</Badge></Group></Group><Group gap="xs" align="flex-start" wrap="wrap"><Text size="xs" fw={600} miw={52}>Objects</Text>{(alert.data?.objects ?? []).length === 0 ? <Text size="xs" c="dimmed">None</Text> : (alert.data?.objects ?? []).map(object => <Badge key={object} size="xs" variant="outline">{object}</Badge>)}</Group><Group gap="xs" align="flex-start" wrap="wrap"><Text size="xs" fw={600} miw={52}>Verified</Text>{(alert.data?.verified_objects ?? []).length === 0 ? <Text size="xs" c="dimmed">None</Text> : (alert.data?.verified_objects ?? []).map(object => <Badge key={"verified-" + object} size="xs" color="green" variant="light">{object}</Badge>)}</Group><Group gap="xs" align="flex-start" wrap="wrap"><Text size="xs" fw={600} miw={52}>Zones</Text>{(alert.data?.zones ?? []).length === 0 ? <Text size="xs" c="dimmed">None</Text> : (alert.data?.zones ?? []).map(zone => <Badge key={"zone-" + zone} size="xs" color="blue" variant="light">{zone}</Badge>)}</Group></Stack></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-frigate-system",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Frigate System Metrics",
      description: "Shows Frigate service, camera, detector, and storage health.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/frigate.svg",
      sources: { default: { type: "integration", name: "Frigate", integrationKind: "frigate" } },
      requests: { stats: { path: "/api/stats", cacheSeconds: 15 } },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%">
  <Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0}><Text fw={700}>Frigate system</Text><Text size="xs" c="dimmed">Version {data.stats?.service?.version ?? "unavailable"} · uptime {data.stats?.service?.uptime != null && isFinite(data.stats.service.uptime) ? Math.floor(data.stats.service.uptime / 86400) + "d " + Math.floor((data.stats.service.uptime % 86400) / 3600) + "h " + Math.floor((data.stats.service.uptime % 3600) / 60) + "m" : "unavailable"}</Text></Stack><Group gap="xs"><Badge color={status.stats?.loading ? "blue" : status.stats?.error ? "red" : status.stats?.ok === true ? "green" : "yellow"} variant="light">{status.stats?.loading ? "Loading" : status.stats?.error ? "Error" : status.stats?.ok === true ? "Service ready" : "Service unready"}</Badge><RefreshButton requestId="stats" label="Refresh system stats" /></Group></Group>
  {status.stats?.loading ? <Stack gap="xs"><Skeleton height={78} radius="md" /><Skeleton height={120} radius="md" /></Stack> : status.stats?.error ? <Alert color="red" title="Could not load Frigate statistics">{status.stats.error}</Alert> : status.stats?.ok !== true ? <Alert color="yellow" title="Statistics unavailable">Frigate did not return a ready statistics response.</Alert> : <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}><Stack gap="sm"><Paper withBorder p="xs" radius="md"><Stack gap="xs"><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0}><Text size="xs" fw={700} c="dimmed" tt="uppercase">Health summary</Text><Text size="sm" fw={650}>{Object.keys(data.stats?.cameras ?? {}).length} cameras · {Object.keys(data.stats?.detectors ?? {}).length} detectors · {Object.keys(data.stats?.service?.storage ?? {}).length} storage paths</Text></Stack></Group><Divider /><Stack gap={4}><Text size="xs" fw={700} c="dimmed" tt="uppercase">Pipeline throughput</Text><Group gap="lg" wrap="wrap">{[{ label: "Camera", value: data.stats?.camera_fps }, { label: "Detection", value: data.stats?.detection_fps }, { label: "Process", value: data.stats?.process_fps }, { label: "Skipped", value: data.stats?.skipped_fps }].map(metric => <Group key={metric.label} gap={4}><Text fw={750}>{metric.value != null ? Number(metric.value).toFixed(1) : "—"}</Text><Text size="xs" c="dimmed">{metric.label} FPS</Text></Group>)}</Group></Stack></Stack></Paper><Paper withBorder p="xs" radius="md"><Stack gap={4}><Group justify="space-between"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Cameras</Text><Badge size="xs" variant="light">{Object.keys(data.stats?.cameras ?? {}).length}</Badge></Group>{Object.keys(data.stats?.cameras ?? {}).length === 0 ? <Text size="xs" c="dimmed">No camera statistics reported.</Text> : <Stack gap={0}>{Object.entries(data.stats?.cameras ?? {}).map(entry => <Box key={entry[0]} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={1} style={{ minWidth: 0, flex: 1 }}><Text fw={650} style={{ overflowWrap: "anywhere" }}>{entry[0]}</Text><Text size="xs" c="dimmed">{entry[1]?.camera_fps != null ? Number(entry[1].camera_fps).toFixed(1) : "—"} FPS · {entry[1]?.reconnects_last_hour ?? "—"} reconnects · {entry[1]?.stalls_last_hour ?? "—"} stalls</Text></Stack><Badge size="xs" color={entry[1]?.connection_quality === "excellent" ? "green" : entry[1]?.connection_quality === "fair" ? "yellow" : entry[1]?.connection_quality == null || entry[1]?.connection_quality === "unknown" ? "gray" : "red"} variant="light">{String(entry[1]?.connection_quality ?? "unknown").replaceAll("_", " ")}</Badge></Group></Box>)}</Stack>}</Stack></Paper><Paper withBorder p="xs" radius="md"><Stack gap={4}><Group justify="space-between"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Detectors</Text><Badge size="xs" variant="light">{Object.keys(data.stats?.detectors ?? {}).length}</Badge></Group>{Object.keys(data.stats?.detectors ?? {}).length === 0 ? <Text size="xs" c="dimmed">No detector statistics reported.</Text> : <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={0}>{Object.entries(data.stats?.detectors ?? {}).map(entry => <Box key={entry[0]} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>{entry[0]}</Text><Text fw={650}>{entry[1]?.inference_speed != null ? Number(entry[1].inference_speed).toFixed(1) : "Unavailable"}</Text><Text size="xs" c="dimmed">Inference speed · ms</Text></Box>)}</SimpleGrid>}</Stack></Paper><Paper withBorder p="xs" radius="md"><Stack gap={4}><Group justify="space-between"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Storage</Text><Badge size="xs" variant="light">{Object.keys(data.stats?.service?.storage ?? {}).length}</Badge></Group>{Object.keys(data.stats?.service?.storage ?? {}).length === 0 ? <Text size="xs" c="dimmed">No storage statistics reported.</Text> : <Stack gap={0}>{Object.entries(data.stats?.service?.storage ?? {}).map(entry => <Box key={entry[0]} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Stack gap={4}><Group justify="space-between" align="flex-start" wrap="wrap"><Text size="xs" fw={650} style={{ overflowWrap: "anywhere" }}>{entry[0]}</Text><Group gap={4} wrap="wrap"><Text size="xs" c="dimmed">{entry[1]?.used != null && entry[1]?.total != null && isFinite(entry[1].used) && isFinite(entry[1].total) && Number(entry[1].total) > 0 ? Math.min(100, Math.max(0, Number(entry[1].used) / Number(entry[1].total) * 100)).toFixed(0) + "% used" : "Utilization unavailable"}</Text>{entry[1]?.mount_type ? <Badge size="xs" color="gray" variant="light">{entry[1].mount_type}</Badge> : null}</Group></Group><Text size="xs" c="dimmed">Used {entry[1]?.used != null && isFinite(entry[1].used) ? Number(entry[1].used).toLocaleString() : "—"} MiB · Free {entry[1]?.free != null && isFinite(entry[1].free) ? Number(entry[1].free).toLocaleString() : entry[1]?.used != null && entry[1]?.total != null && isFinite(entry[1].used) && isFinite(entry[1].total) ? Math.max(0, Number(entry[1].total) - Number(entry[1].used)).toLocaleString() : "—"} MiB · Total {entry[1]?.total != null && isFinite(entry[1].total) ? Number(entry[1].total).toLocaleString() : "—"} MiB</Text>{entry[1]?.used != null && entry[1]?.total != null && isFinite(entry[1].used) && isFinite(entry[1].total) && Number(entry[1].total) > 0 ? <Progress value={Math.min(100, Math.max(0, Number(entry[1].used) / Number(entry[1].total) * 100))} size="sm" /> : null}</Stack></Box>)}</Stack>}</Stack></Paper></Stack></ScrollArea>}
</Stack>`,
    },
  },
  {
    id: "seed-frigate-live-streams",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Frigate Stream Readiness",
      description: "Shows live go2rtc stream readiness and active producer and consumer counts.",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/frigate.svg",
      sources: { default: { type: "integration", name: "Frigate", integrationKind: "frigate" } },
      requests: { streams: { path: "/api/go2rtc/streams", cacheSeconds: 10 } },
      options: {},
      template: `<Stack gap="sm" p="sm" h="100%">
  <Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={0}><Text fw={700}>Frigate stream readiness</Text><Text size="xs" c="dimmed">Ready-state health for go2rtc producers and consumers</Text></Stack><Group gap="xs" wrap="wrap">{status.streams?.loading ? <Badge color="blue" variant="light">Loading</Badge> : status.streams?.error ? <Badge color="red" variant="light">Error</Badge> : <Group gap={4} wrap="wrap"><Badge color="green" variant="light">{Object.values(data.streams ?? {}).filter(stream => (stream?.producers ?? []).length > 0).length} live</Badge><Badge color="red" variant="light">{Object.values(data.streams ?? {}).filter(stream => (stream?.producers ?? []).length === 0).length} offline</Badge><Badge color="blue" variant="light">{Object.values(data.streams ?? {}).reduce((count, stream) => count + (stream?.consumers ?? []).length, 0)} consumers</Badge></Group>}<RefreshButton requestId="streams" label="Refresh streams" /></Group></Group>
  {status.streams?.loading ? <Stack gap="xs"><Skeleton height={72} radius="md" /><Skeleton height={72} radius="md" /></Stack> : status.streams?.error ? <Alert color="red" title="Could not load live streams">{status.streams.error}</Alert> : Object.keys(data.streams ?? {}).length === 0 ? <Alert color="gray" title="No live streams">Frigate returned no configured go2rtc streams.</Alert> : <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }}><Stack gap={0}>{Object.entries(data.streams ?? {}).map(entry => <Box key={entry[0]} py="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Stack gap="xs"><Group justify="space-between" align="flex-start" wrap="wrap"><Group gap="xs" align="flex-start" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}><Badge size="xs" color={(entry[1]?.producers ?? []).length > 0 ? "green" : "red"} variant="light">{(entry[1]?.producers ?? []).length > 0 ? "Live" : "Offline"}</Badge><Stack gap={1} style={{ minWidth: 0, flex: 1 }}><Text fw={650} style={{ overflowWrap: "anywhere" }}>{entry[0]}</Text><Text size="xs" c="dimmed">{(entry[1]?.producers ?? []).length} producer{(entry[1]?.producers ?? []).length === 1 ? "" : "s"}</Text></Stack></Group><Badge size="xs" color={(entry[1]?.consumers ?? []).length > 0 ? "blue" : "gray"} variant="light">{(entry[1]?.consumers ?? []).length} active consumer{(entry[1]?.consumers ?? []).length === 1 ? "" : "s"}</Badge></Group>{(entry[1]?.producers ?? []).length === 0 ? <Text size="xs" c="dimmed">No active producer media.</Text> : <Stack gap="xs">{(entry[1]?.producers ?? []).map((producer, producerIndex) => <Stack key={"producer-" + producerIndex} gap={2}><Text size="xs" fw={600}>Producer {producerIndex + 1} · {(producer.medias ?? []).length} media</Text>{(producer.medias ?? []).length === 0 ? <Text size="xs" c="dimmed">Connected; media not reported</Text> : <Group gap="xs" align="flex-start" wrap="wrap">{(producer.medias ?? []).map((media, mediaIndex) => <Text key={"media-" + producerIndex + "-" + mediaIndex} size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>{media}</Text>)}</Group>}</Stack>)}</Stack>}</Stack></Box>)}</Stack></ScrollArea>}
</Stack>`,
    },
  },
] as const;
