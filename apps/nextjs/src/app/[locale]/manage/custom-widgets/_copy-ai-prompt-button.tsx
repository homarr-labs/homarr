"use client";

import { Button, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconSparkles } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

const PROMPT_HEADER = `You are helping configure a Homarr custom widget. Homarr is a self-hosted dashboard that can display data from any API endpoint as a widget.

## Your Task
Generate a valid JSON configuration for a Homarr custom widget based on the user's description and the API response below. If you need clarification, ask specific questions.

## Output Format
- Output the JSON inside a \`\`\`json code block for syntax highlighting. If \`\`\`json is not supported, use a generic \`\`\` code block instead.
- Do NOT include any text before or after the JSON block unless you have clarifying questions.
- If your environment supports structured/JSON output mode, use it.

## JSON Schema
The output must conform to this JSON Schema:

`;

const PROMPT_RULES = `

## Key Rules
- The \`displayConfig.type\` field MUST match the \`displayType\` field exactly
- All \`jsonPath\` fields use JSONPath syntax (e.g. \`$.data.count\`, \`$.items[*].name\`)
- The \`$schema\` field should be \`"homarr-custom-widget-v2"\`
- Do NOT include secrets/passwords in the output — those are configured separately in the UI
- \`url\` must be a full URL including protocol (e.g. \`https://...\`)
- For arrays of items, inspect the API response to find the correct paths

## Display Type Guide
- \`singleValue\`: One prominent number/text
- \`keyValue\`: Labeled pairs — use \`mappings\` array
- \`table\`: Tabular data — \`tablePath\` + \`columns\`
- \`statGrid\`: Grid of stat cards with colors
- \`progressBars\`: Visual progress bars with value/max
- \`statusIndicator\`: Green/red dots based on value matching
- \`countGrid\`: Simple count grid
- \`raw\`: Raw JSON display
- \`actionButton\`: Button that triggers the API call on click
- \`customJsx\`: **Full Mantine v9 JSX** — complete creative control. Set \`displayConfig.template\` to a JSX string.

## Custom JSX (\`customJsx\`) — Component Reference

All Mantine v9 components listed below are available. For full Mantine prop documentation, refer to https://mantine.dev/llms.txt or use Context7/web search for any component's detailed API.

### Layout
Box, Stack, Group, Flex, Grid + Grid.Col, SimpleGrid, Center, Space, Container, AspectRatio, Overlay, ScrollArea

### Typography
Text, Title, Code, Highlight, Mark, Kbd, Blockquote, Anchor (href sanitized), NumberFormatter, Marquee, RollingNumber

### Data Display
Badge, Card + Card.Section, Paper, Alert, ThemeIcon, ColorSwatch, Table (+ Thead/Tbody/Tfoot/Caption/Tr/Th/Td), List + List.Item, Timeline + Timeline.Item, Accordion (+ Item/Control/Panel), Indicator, Pill, Spoiler, Progress + Progress.Section, RingProgress, SemiCircleProgress, Skeleton, Loader, Image, Avatar + Avatar.Group, BackgroundImage, Tooltip, Divider, DataList (+ Item/ItemLabel/ItemValue), EmptyState (+ Indicator/Title/Description/Actions), Fieldset, Notification (visual), Rating (read-only)

### Navigation
Breadcrumbs, NavLink (href sanitized), Stepper + Stepper.Step, Tabs + Tabs.List + Tabs.Tab + Tabs.Panel, Tree

### Interactive Display (visual only — no event handlers)
Button, ActionIcon, Burger, CloseButton, Chip + Chip.Group, Pagination, SegmentedControl, Slider (read-only), Switch (read-only)

### Hover Overlays & Menus
HoverCard + HoverCard.Target + HoverCard.Dropdown, Menu + Menu.Target + Menu.Dropdown + Menu.Item + Menu.Label + Menu.Divider

### Utility
CopyButton (click-to-copy, props: \`value\`), Collapse (animate show/hide, props: \`in\`), Transition (animate, props: \`mounted\`, \`transition\`)

### Charts (@mantine/charts — ALL)
AreaChart, BarChart, LineChart, DonutChart, PieChart, RadarChart, RadialBarChart, Sparkline, BubbleChart, CompositeChart, FunnelChart, Heatmap, ScatterChart, SankeyChart, Treemap, BarsList

### Dates (@mantine/dates)
Calendar (static), MiniCalendar (static), DatePicker (static/read-only), TimeValue

### SubFetch — In-Widget HTTP Requests (server-proxied)
These components make HTTP requests through the Homarr server proxy (same-origin as widget URL, inherits widget auth). HTTP method warnings are shown in the widget UI.

**SubFetch** — Fetch data from a sub-endpoint and display results.
Props: \`url\` (relative or absolute), \`method\` (GET|POST|PUT|DELETE|PATCH), \`body\` (JSON string), \`headers\` (JSON string), \`trigger\` ("auto"|"manual"), \`label\`, \`color\`, \`display\` ("json"|"text"), \`path\` (dot-path for display="text")
\`\`\`jsx
<SubFetch url="/api/v1/status" trigger="auto">
  <SubData path="name" as="Title" order={3} />
  <SubData path="status" as="Badge" color="green" />
</SubFetch>
\`\`\`

**SubData** — Reads data from parent SubFetch context.
Props: \`path\` (dot-notation), \`as\` ("Text"|"Title"|"Badge"|"Code"), \`size\`, \`color\`, \`fw\`, \`c\`, \`order\`

**ActionButton** — Button that fires an HTTP request on click.
Props: \`url\`, \`method\` (default POST), \`body\`, \`headers\`, \`label\`, \`color\`, \`variant\`, \`size\`, \`confirmMessage\`, \`successMessage\`, \`icon\` (play|check|refresh|power|trash), \`fullWidth\`, \`disabled\`
\`\`\`jsx
<ActionButton url="/api/lights/1/toggle" method="POST" label="Toggle Light" color="yellow" icon="power" confirmMessage="Toggle the light?" />
\`\`\`

**ToggleSwitch** — Switch that sends different payloads for on/off states.
Props: \`url\`, \`method\` (default POST), \`onBody\` (JSON), \`offBody\` (JSON), \`initialValue\`, \`label\`, \`color\`, \`size\`, \`disabled\`
\`\`\`jsx
<ToggleSwitch url="/api/lights/1" onBody='{"state":"on"}' offBody='{"state":"off"}' label="Living Room" color="yellow" />
\`\`\`

**RefreshButton** — Re-fetches the parent widget data.
Props: \`label\`, \`color\`, \`variant\`, \`size\`

### Custom Interactive Components (built-in state)
**PaginatedList** — Paginates children. Props: \`pageSize\` (default 6)
**TabsContainer + TabPanel** — Tabbed UI. TabsContainer: \`defaultTab\`. TabPanel: \`value\`, \`label\`
**Collapsible** — Expand/collapse. Props: \`title\`, \`defaultOpen\`
**StatBar** — Horizontal stat bar. Props: \`value\`, \`max\`, \`label\`, \`color\`
**TypeBadge** — Colored type badge (auto-maps: fire→red, water→blue, etc.). Props: \`type\`, \`size\`

### Bindings
- \`data\` — full API response
- \`String(v)\`, \`Number(v)\`, \`Boolean(v)\`, \`parseInt(v)\`, \`parseFloat(v)\`
- \`Math.round/floor/ceil/abs/min/max/pow/sqrt/PI\`
- \`JSON.stringify(v)\`, \`Array.isArray(v)\`, \`Array.from(v)\`, \`Object.keys/values/entries(v)\`
- \`Date.now()\`, \`Date.create(v)\`, \`Date.toISOString(v)\`, \`Date.toLocaleDateString(v, locale?)\`, \`Date.toLocaleTimeString(v, locale?)\`, \`Date.getTime(v)\`, \`Date.getYear(v)\`, \`Date.getMonth(v)\`, \`Date.getDay(v)\`
- \`encodeURIComponent(v)\`, \`decodeURIComponent(v)\`, \`isNaN(v)\`, \`isFinite(v)\`
- \`.map()\`, \`.filter()\`, \`.slice()\`, ternaries for conditionals

**FORBIDDEN keywords:** constructor, __proto__, eval, Function, import, require, globalThis, window, document

### Chart Data Formats
- BarChart/LineChart/AreaChart: \`data={items}\` + \`dataKey="x"\` + \`series={[{name:"y",color:"blue"}]}\`
- DonutChart/PieChart: \`data={[{name,value,color}]}\`
- ScatterChart: \`data={items}\` + \`dataKey={xKey}\` + \`series={[{name, color}]}\`
- CompositeChart: same as Bar/Line/Area + \`composedChart\` with type per series
- Sparkline: \`data={[numbers]}\`
- Heatmap: \`data={items}\` + \`dataKey\` + \`series\`

### Pokédex Example (75 pokemon)
API: \`https://pokeapi.co/api/v2/pokemon?limit=75\`
\`\`\`jsx
<Stack gap="sm" p="xs">
  <Group justify="space-between">
    <Title order={3}>Pokédex</Title>
    <Badge size="lg" color="red">{data.count} total</Badge>
  </Group>
  <PaginatedList pageSize={10}>
    {data.results.map((pokemon, i) =>
      <Card withBorder p="xs" mb="xs">
        <Group wrap="nowrap">
          <Avatar src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + String(i + 1) + ".png"} size="lg" radius="sm" />
          <Stack gap={0} style={{flex: 1}}>
            <Text fw={700} tt="capitalize">{pokemon.name}</Text>
            <Text size="xs" c="dimmed">#{String(i + 1).padStart(3, "0")}</Text>
          </Stack>
        </Group>
      </Card>
    )}
  </PaginatedList>
</Stack>
\`\`\`

### Pokédex with Detail Fetch (SubFetch for sub-resources)
API: \`https://pokeapi.co/api/v2/pokemon?limit=75\`
\`\`\`jsx
<Stack gap="sm" p="xs">
  <Title order={3}>Pokédex</Title>
  <PaginatedList pageSize={5}>
    {data.results.map((pokemon, i) =>
      <Card withBorder p="xs" mb="xs">
        <Group wrap="nowrap">
          <Avatar src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + String(i + 1) + ".png"} size={60} radius="sm" />
          <Stack gap={2} style={{flex: 1}}>
            <Text fw={700} tt="capitalize">{pokemon.name}</Text>
            <SubFetch url={pokemon.url} trigger="auto">
              <Group gap="xs">
                <SubData path="types.0.type.name" as="Badge" color="red" />
                <SubData path="stats.0.base_stat" as="Text" size="xs" />
              </Group>
            </SubFetch>
          </Stack>
        </Group>
      </Card>
    )}
  </PaginatedList>
</Stack>
\`\`\`

### Stocks Dashboard (Charts + Live Data)
API: \`https://your-stocks-api.com/portfolio\`
\`\`\`jsx
<Stack gap="md" p="sm">
  <Group justify="space-between">
    <Title order={3}>Portfolio</Title>
    <RefreshButton label="Refresh" size="xs" />
  </Group>
  <SimpleGrid cols={3}>
    {data.holdings.map(stock =>
      <Card withBorder p="xs">
        <Text fw={700}>{stock.symbol}</Text>
        <NumberFormatter value={stock.price} prefix="$" decimalScale={2} />
        <Sparkline data={stock.history} h={40} color={stock.change > 0 ? "green" : "red"} />
      </Card>
    )}
  </SimpleGrid>
  <LineChart h={200} data={data.timeline} dataKey="date" series={[{name: "value", color: "blue"}]} />
</Stack>
\`\`\`

### Navidrome Mini-Player (Buttons + State)
API: \`https://your-navidrome.local/api/nowplaying\`
\`\`\`jsx
<Stack gap="sm" p="sm">
  <Group wrap="nowrap">
    <Image src={data.albumArt} w={80} h={80} radius="sm" />
    <Stack gap={2} style={{flex: 1}}>
      <Text fw={700} lineClamp={1}>{data.title}</Text>
      <Text size="sm" c="dimmed" lineClamp={1}>{data.artist}</Text>
      <Progress value={data.progress} size="xs" color="red" />
    </Stack>
  </Group>
  <Group justify="center" gap="sm">
    <ActionButton url="/api/player/previous" method="POST" label="Prev" size="xs" variant="subtle" />
    <ActionButton url="/api/player/toggle" method="POST" label={data.playing ? "Pause" : "Play"} icon="play" color="red" />
    <ActionButton url="/api/player/next" method="POST" label="Next" size="xs" variant="subtle" />
  </Group>
  <Group justify="center">
    <ToggleSwitch url="/api/player/shuffle" method="POST" onBody='{"shuffle":true}' offBody='{"shuffle":false}' initialValue={data.shuffle} label="Shuffle" size="xs" />
    <ToggleSwitch url="/api/player/repeat" method="POST" onBody='{"repeat":true}' offBody='{"repeat":false}' initialValue={data.repeat} label="Repeat" size="xs" />
  </Group>
</Stack>
\`\`\`

### Smart Home Light Switch
API: \`https://your-ha.local/api/states/light.living_room\`
\`\`\`jsx
<Stack gap="md" p="sm">
  <Group justify="space-between">
    <Title order={4}>Living Room</Title>
    <Badge color={data.state === "on" ? "yellow" : "gray"}>{data.state}</Badge>
  </Group>
  <ToggleSwitch url="/api/services/light/toggle" method="POST" onBody='{"entity_id":"light.living_room"}' offBody='{"entity_id":"light.living_room"}' initialValue={data.state === "on"} label="Power" color="yellow" />
  <ActionButton url="/api/services/light/turn_off" method="POST" body='{"entity_id":"light.living_room"}' label="Force Off" color="red" icon="power" confirmMessage="Turn off?" />
</Stack>
\`\`\`

## API Response
`;

const PROMPT_NO_RESPONSE = `Paste the raw JSON response from your API endpoint below:

\`\`\`json
PASTE_YOUR_API_RESPONSE_HERE
\`\`\`
`;

const PROMPT_FOOTER = `
## Your Request
Describe what you want the widget to show:

`;

function buildAiPrompt(
  jsonSchema: unknown,
  rawResponse?: string | null,
  currentConfig?: Record<string, unknown> | null,
) {
  const schemaStr = JSON.stringify(jsonSchema, null, 2);
  const responseSection = rawResponse
    ? `The API returned the following JSON:\n\n\`\`\`json\n${rawResponse}\n\`\`\`\n`
    : PROMPT_NO_RESPONSE;

  const configSection = currentConfig
    ? `\n## Current Widget Configuration\nThe widget is currently configured as follows. Use this as a starting point and modify based on the user's request:\n\n\`\`\`json\n${JSON.stringify(currentConfig, null, 2)}\n\`\`\`\n`
    : "";

  return PROMPT_HEADER + schemaStr + PROMPT_RULES + responseSection + configSection + PROMPT_FOOTER;
}

interface CopyAiPromptButtonProps {
  rawResponse?: string | null;
  currentConfig?: Record<string, unknown> | null;
}

export const CopyAiPromptButton = ({ rawResponse, currentConfig }: CopyAiPromptButtonProps) => {
  const t = useScopedI18n("customWidget");
  const [opened, { open, close }] = useDisclosure(false);
  const { data: schema, isLoading } = clientApi.customWidget.schema.useQuery();

  const handleCopy = async () => {
    if (!schema) return;
    const prompt = buildAiPrompt(schema, rawResponse, currentConfig);
    try {
      await navigator.clipboard.writeText(prompt);
      close();
      showSuccessNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopied") });
    } catch {
      showErrorNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopyError") });
    }
  };

  return (
    <Popover opened={opened} onClose={close} width={320} position="bottom" shadow="md" withinPortal>
      <Popover.Target>
        <Button
          variant="light"
          leftSection={<IconSparkles size={16} />}
          onClick={open}
          loading={isLoading}
          disabled={!schema}
          fullWidth
          size="sm"
        >
          {t("action.copyAiPrompt")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm">{t("notification.aiPromptDescription")}</Text>
          {!rawResponse && (
            <Text size="xs" c="dimmed" fs="italic">
              {t("notification.aiPromptNoResponse")}
            </Text>
          )}
          <Button leftSection={<IconCopy size={16} />} onClick={() => void handleCopy()} fullWidth>
            {t("notification.aiPromptCopy")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
