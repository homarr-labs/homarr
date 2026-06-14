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
- \`singleValue\`: Show one prominent number/text (e.g. total count, status)
- \`keyValue\`: Show labeled pairs like "CPU: 45%" — use \`mappings\` array
- \`table\`: Show tabular data from an array — needs \`tablePath\` for the array and \`columns\` for headers
- \`statGrid\`: Grid of stat cards with optional colors — great for dashboards (e.g. "Movies: 38, Series: 63")
- \`progressBars\`: Visual progress bars with value/max — for storage, quotas, etc.
- \`statusIndicator\`: Green/red dots based on value matching — for service health checks
- \`countGrid\`: Simple grid of counts — like statGrid but simpler, no colors
- \`raw\`: Raw JSON display — for debugging or complex data
- \`actionButton\`: A button that triggers the API call on click — for POST/PUT actions
- \`customJsx\`: Custom JSX layout using whitelisted Mantine components — full creative control over presentation. Set \`displayConfig.template\` to a JSX string. Access API data via \`{data.fieldName}\` bindings (e.g. \`{data.name}\`, \`{data.items[0].title}\`).

## Custom JSX (\`customJsx\`) — Available Mantine Components
When using \`customJsx\`, the template supports whitelisted Mantine UI components. These are React components from the Mantine v9 library. Use their props as documented below.

### Layout Components
- **Stack** — Vertical flex container. Props: \`gap\` (xs|sm|md|lg|xl or number), \`align\` (stretch|center|flex-start|flex-end), \`justify\`
- **Group** — Horizontal flex container. Props: \`gap\`, \`justify\` (flex-start|center|space-between|space-around|flex-end), \`wrap\` (wrap|nowrap), \`grow\` (boolean)
- **Flex** — Generic flex container. Props: \`direction\` (row|column), \`gap\`, \`align\`, \`justify\`, \`wrap\`
- **Grid** + **Grid.Col** — CSS grid layout. Grid props: \`gutter\` (gap). Grid.Col props: \`span\` (1-12 or "auto"), \`offset\`
- **SimpleGrid** — Auto-column grid. Props: \`cols\` (number), \`spacing\`, \`verticalSpacing\`
- **Center** — Centers content. Props: \`inline\` (boolean)
- **Space** — Empty spacing. Props: \`h\` (height), \`w\` (width)
- **Container** — Max-width wrapper. Props: \`size\` (xs|sm|md|lg|xl), \`fluid\` (boolean)
- **AspectRatio** — Maintains aspect ratio. Props: \`ratio\` (number, e.g. 16/9)

### Typography Components
- **Text** — Body text. Props: \`size\` (xs|sm|md|lg|xl), \`fw\` (font-weight number, e.g. 700), \`c\` (color: "dimmed"|"red"|"blue"|...), \`ta\` (text-align), \`tt\` (text-transform: "capitalize"|"uppercase"|"lowercase"), \`td\` (text-decoration), \`lineClamp\` (number), \`truncate\` (boolean), \`span\` (renders as span)
- **Title** — Heading. Props: \`order\` (1-6, maps to h1-h6), \`size\`, \`c\`, \`ta\`, \`tt\`
- **Code** — Inline code. Props: \`color\`, \`block\` (boolean for code block)
- **Highlight** — Text with highlighted substring. Props: \`highlight\` (string or string[])
- **Mark** — Highlighted text background. Props: \`color\`
- **Kbd** — Keyboard key display
- **Blockquote** — Styled quote. Props: \`color\`, \`cite\`, \`icon\`
- **Anchor** — Link. Props: \`href\`, \`target\`, \`underline\` ("always"|"hover"|"never")
- **NumberFormatter** — Formatted number display. Props: \`value\` (number), \`prefix\` (e.g. "$"), \`suffix\` (e.g. "%"), \`thousandSeparator\` (boolean or string), \`decimalScale\` (number)

### Data Display Components
- **Badge** — Label badge. Props: \`color\`, \`variant\` (filled|light|outline|dot|default), \`size\` (xs|sm|md|lg|xl), \`radius\`, \`tt\`
- **Card** + **Card.Section** — Content card. Card props: \`shadow\` (xs|sm|md|lg|xl), \`padding\`/\`p\`, \`radius\`, \`withBorder\` (boolean). Card.Section props: \`withBorder\`, \`inheritPadding\`
- **Paper** — Surface container. Props: \`shadow\`, \`p\`, \`radius\`, \`withBorder\`
- **Alert** — Notification box. Props: \`color\`, \`variant\` (filled|light|outline), \`title\`, \`icon\`
- **ThemeIcon** — Icon container. Props: \`color\`, \`variant\`, \`size\`, \`radius\`
- **ColorSwatch** — Color preview. Props: \`color\` (CSS color string)
- **Table** + **Table.Thead**, **Table.Tbody**, **Table.Tr**, **Table.Th**, **Table.Td** — HTML table. Table props: \`striped\` (boolean), \`withTableBorder\`, \`withColumnBorders\`, \`highlightOnHover\`
- **List** + **List.Item** — Ordered/unordered list. List props: \`type\` ("ordered"|"unordered"), \`icon\`, \`spacing\`
- **Timeline** + **Timeline.Item** — Vertical timeline. Timeline props: \`active\` (number), \`bulletSize\`. Item props: \`title\`, \`bullet\`
- **Accordion** + **.Item** + **.Control** + **.Panel** — Collapsible sections. Item props: \`value\` (string). Control: clickable header. Panel: content.
- **Indicator** — Dot indicator on content. Props: \`color\`, \`position\`, \`size\`, \`label\`, \`processing\` (boolean)
- **Pill** — Removable tag. Props: \`size\`, \`withRemoveButton\`
- **Spoiler** — Show more/less. Props: \`maxHeight\` (number), \`showLabel\`, \`hideLabel\`

### Feedback Components
- **Progress** + **Progress.Section** — Progress bar. Progress props: \`value\` (0-100), \`color\`, \`size\`, \`radius\`, \`striped\`, \`animated\`. Section props: \`value\`, \`color\`
- **RingProgress** — Circular progress. Props: \`sections\` (array of {value, color}), \`size\`, \`thickness\`, \`label\` (ReactNode)
- **Skeleton** — Loading placeholder. Props: \`height\`, \`width\`, \`radius\`, \`visible\` (boolean)
- **Loader** — Spinner. Props: \`size\`, \`color\`, \`type\` (oval|bars|dots)

### Media Components
- **Image** — Responsive image. Props: \`src\`, \`alt\`, \`w\` (width), \`h\` (height), \`radius\`, \`fit\` (cover|contain|fill)
- **Avatar** + **Avatar.Group** — User avatar. Props: \`src\`, \`alt\`, \`size\` (xs|sm|md|lg|xl or number), \`radius\` (sm|xl), \`color\`
- **BackgroundImage** — Background image container. Props: \`src\`, \`radius\`
- **Tooltip** — Hover tooltip. Props: \`label\` (string), \`position\` (top|bottom|left|right), \`withArrow\`
- **Divider** — Horizontal/vertical rule. Props: \`orientation\` (horizontal|vertical), \`label\`, \`labelPosition\`, \`size\`
- **ScrollArea** — Scrollable container. Props: \`h\` (height), \`type\` (auto|always|scroll|hover)

### Charts (@mantine/charts)
- **AreaChart**, **BarChart**, **LineChart** — Props: \`data\` (array of objects), \`dataKey\` (x-axis key), \`series\` (array of {name, color}), \`h\` (height), \`curveType\` (for Area/Line)
- **DonutChart**, **PieChart** — Props: \`data\` (array of {name, value, color}), \`h\`, \`withLabels\`, \`withLabelsLine\`
- **RadarChart** — Props: \`data\`, \`dataKey\`, \`series\`
- **RadialBarChart** — Props: \`data\` (array of {name, value, color}), \`h\`
- **Sparkline** — Props: \`data\` (flat number array), \`h\`, \`w\`, \`color\`, \`curveType\`

### Common Prop Patterns
- **Spacing/sizing:** Most components accept \`p\` (padding), \`m\` (margin), \`px\`/\`py\`/\`mx\`/\`my\`/\`pt\`/\`pb\`/\`pl\`/\`pr\`/\`mt\`/\`mb\`/\`ml\`/\`mr\` with values xs|sm|md|lg|xl or numbers
- **Colors:** Use Mantine color names: "red", "blue", "green", "orange", "violet", "pink", "cyan", "grape", "teal", "yellow", "lime", "indigo", "gray", "dark". Add shade suffix: "red.6", "blue.4"
- **Styles:** Use \`style={{...}}\` for inline CSS. E.g. \`style={{flex: 1, minWidth: 0}}\`
- **Conditional rendering:** Use ternaries: \`{condition ? <Text>Yes</Text> : <Text>No</Text>}\`
- **Responsive:** Most size/spacing props accept object: \`{{ base: "sm", md: "lg" }}\`

### Interactive Components (built-in, state-managed)
These components manage their own internal state — they provide interactivity without event handlers:

**PaginatedList** — Paginates its children with prev/next buttons.
Props: \`pageSize\` (number, default 6)
Usage: Wrap a \`.map()\` expression to paginate results.
\`\`\`jsx
<PaginatedList pageSize={8}>
  {data.results.map(item =>
    <Card withBorder p="xs" mb="xs">
      <Text>{item.name}</Text>
    </Card>
  )}
</PaginatedList>
\`\`\`

**TabsContainer + TabPanel** — Tabbed interface with automatic tab switching.
TabsContainer props: \`defaultTab\` (string, optional — defaults to first tab)
TabPanel props: \`value\` (string, required — unique tab ID), \`label\` (string, optional — tab display text)
\`\`\`jsx
<TabsContainer defaultTab="overview">
  <TabPanel value="overview" label="Overview">
    <Text>{data.description}</Text>
  </TabPanel>
  <TabPanel value="stats" label="Statistics">
    <Text>Total: {data.count}</Text>
  </TabPanel>
</TabsContainer>
\`\`\`

**Collapsible** — Expandable/collapsible section with a title.
Props: \`title\` (string, required), \`defaultOpen\` (boolean, default false)
\`\`\`jsx
<Collapsible title="Details" defaultOpen={true}>
  <Text>{data.details}</Text>
</Collapsible>
\`\`\`

**StatBar** — A horizontal stat bar with label/value (great for RPG-style stats, progress).
Props: \`value\` (number), \`max\` (number, default 100), \`label\` (string), \`color\` (Mantine color)
\`\`\`jsx
<StatBar label="HP" value={45} max={100} color="red" />
<StatBar label="ATK" value={80} max={255} color="orange" />
\`\`\`

**TypeBadge** — A colored badge that maps common type names to colors (normal, fire, water, electric, grass, ice, fighting, poison, ground, flying, psychic, bug, rock, ghost, dragon, dark, steel, fairy).
Props: \`type\` (string), \`size\` (xs|sm|md|lg|xl, default sm)
\`\`\`jsx
<Group gap="xs">
  <TypeBadge type="fire" />
  <TypeBadge type="flying" />
</Group>
\`\`\`

**Available bindings in templates:**
- \`data\` — the full API response JSON object
- \`String(v)\`, \`Number(v)\`, \`Boolean(v)\` — type coercion helpers
- \`Math.round\`, \`Math.floor\`, \`Math.ceil\`, \`Math.abs\`, \`Math.min\`, \`Math.max\`, \`Math.pow\`, \`Math.sqrt\`, \`Math.PI\`
- \`JSON.stringify(v)\`, \`Array.isArray(v)\`, \`Object.keys(v)\`, \`Object.values(v)\`, \`Object.entries(v)\`
- Expression arrows for \`.map()\`, \`.filter()\`, \`.slice()\` — e.g. \`{data.items.map(item => <Text>{item.name}</Text>)}\`
- Ternaries for conditionals — e.g. \`{data.count > 0 ? "active" : "idle"}\`

**FORBIDDEN keywords (template will be rejected):** constructor, __proto__, eval, Function, import, require, globalThis, window, document, fetch

**Chart data formats:**
- BarChart/LineChart/AreaChart: \`data={data.items}\` + \`dataKey="month"\` (x-axis key) + \`series={[{ name: "count", color: "blue" }]}\` where series \`name\` matches a numeric key in each data row
- DonutChart/PieChart: \`data={data.items}\` where each item is \`{ name: "Label", value: 42, color: "blue" }\` — NO dataKey or series
- Sparkline: \`data={[1,2,3]}\` — flat number array
- NumberFormatter: \`<NumberFormatter value={data.price} thousandSeparator prefix="$" />\`

### Full Pokémon Card Example (demonstrating TypeBadge, StatBar, TabsContainer, Collapsible)
API: \`https://pokeapi.co/api/v2/pokemon/charizard\`
\`\`\`jsx
<Stack gap="sm" p="xs">
  <Group wrap="nowrap">
    <Avatar src={data.sprites.front_default} size={80} radius="sm" />
    <Stack gap={4} style={{flex: 1}}>
      <Title order={3} tt="capitalize">{data.name}</Title>
      <Text size="xs" c="dimmed">#{String(data.id).padStart(3, "0")}</Text>
      <Group gap="xs">
        {data.types.map(t => <TypeBadge type={t.type.name} />)}
      </Group>
    </Stack>
  </Group>
  <TabsContainer defaultTab="stats">
    <TabPanel value="stats" label="Stats">
      <Stack gap="xs" pt="xs">
        {data.stats.map(s =>
          <StatBar label={s.stat.name} value={s.base_stat} max={255} color={s.base_stat > 100 ? "green" : "red"} />
        )}
      </Stack>
    </TabPanel>
    <TabPanel value="abilities" label="Abilities">
      <Stack gap="xs" pt="xs">
        {data.abilities.map(a =>
          <Badge variant={a.is_hidden ? "outline" : "filled"} tt="capitalize">
            {a.ability.name}{a.is_hidden ? " (hidden)" : ""}
          </Badge>
        )}
      </Stack>
    </TabPanel>
    <TabPanel value="moves" label="Moves">
      <Collapsible title="Move list">
        <Group gap="xs" pt="xs">
          {data.moves.slice(0, 20).map(m =>
            <Badge size="xs" variant="light" tt="capitalize">{m.move.name}</Badge>
          )}
        </Group>
      </Collapsible>
    </TabPanel>
  </TabsContainer>
</Stack>
\`\`\`

### Paginated List Example
API: \`https://pokeapi.co/api/v2/pokemon?limit=50\`
\`\`\`jsx
<Stack gap="sm" p="xs">
  <Group justify="space-between">
    <Title order={3}>Pokédex</Title>
    <Badge size="lg" color="red">{data.count} Pokémon</Badge>
  </Group>
  <PaginatedList pageSize={10}>
    {data.results.map((pokemon, i) =>
      <Card withBorder p="xs" mb="xs">
        <Group wrap="nowrap">
          <Avatar
            src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + String(i + 1) + ".png"}
            size="lg"
            radius="sm"
          />
          <Stack gap={0} style={{ flex: 1 }}>
            <Text fw={700} tt="capitalize">{pokemon.name}</Text>
            <Text size="xs" c="dimmed">#{String(i + 1)}</Text>
          </Stack>
        </Group>
      </Card>
    )}
  </PaginatedList>
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
