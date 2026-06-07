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

## Custom JSX (\`customJsx\`) — Available Components
When using \`customJsx\`, the template supports these whitelisted Mantine components:

**Layout:** Stack, Group, Flex, Grid, Grid.Col, SimpleGrid, Center, Space, Container, AspectRatio
**Typography:** Text, Title, Code, Highlight, Mark, Kbd, Blockquote, Anchor, NumberFormatter
**Data display:** Badge, Card, Card.Section, Paper, Alert, ThemeIcon, ColorSwatch, Table (Thead, Tbody, Tr, Th, Td), List, List.Item, Timeline, Timeline.Item, Accordion (Item, Control, Panel), Indicator, Pill, Spoiler
**Feedback:** Progress, Progress.Section, RingProgress, Skeleton, Loader
**Media:** Image, Avatar, Avatar.Group, BackgroundImage, Tooltip, Divider, ScrollArea
**Charts (@mantine/charts):** AreaChart, BarChart, LineChart, DonutChart, PieChart, RadarChart, RadialBarChart, Sparkline

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

**SubFetch** — Fetches a sub-URL server-side and renders a nested JSX template with the result. Enables drill-down views (click to see details).
Props: \`url\` (string, required — must be same hostname as parent widget URL), \`template\` (string, required — JSX template rendered with fetched data as \`data\`), \`definitionId\` (string, required — use \`{definitionId}\` binding to pass the parent widget ID for auth), \`trigger\` ("inline" | "popover", default "popover"), \`buttonLabel\` (string, default "View"), \`buttonVariant\` (string, default "light"), \`width\` (number, default 380)
- The \`template\` prop is a JSX string using the same components and bindings as the main template (except SubFetch itself — no nesting)
- \`trigger="popover"\`: renders a button; clicking opens a popover with fetched content (lazy-loaded on first click)
- \`trigger="inline"\`: fetches on mount and renders directly in place
- Use single quotes for the outer template attribute and escaped double quotes inside, or use \`&quot;\` entities
\`\`\`jsx
<SubFetch
  url="https://pokeapi.co/api/v2/pokemon/pikachu"
  definitionId={definitionId}
  trigger="popover"
  buttonLabel="Details"
  template='<Stack gap="xs"><Title order={4} tt="capitalize">{data.name}</Title><Group gap="xs">{data.types.map(t => <TypeBadge type={t.type.name} />)}</Group>{data.stats.map(s => <StatBar label={s.stat.name} value={s.base_stat} max={255} />)}</Stack>'
/>
\`\`\`

**FORBIDDEN keywords (template will be rejected):** constructor, __proto__, eval, Function, import, require, globalThis, window, document, fetch

**Chart data formats:**
- BarChart/LineChart/AreaChart: \`data={data.items}\` + \`dataKey="month"\` (x-axis key) + \`series={[{ name: "count", color: "blue" }]}\` where series \`name\` matches a numeric key in each data row
- DonutChart/PieChart: \`data={data.items}\` where each item is \`{ name: "Label", value: 42, color: "blue" }\` — NO dataKey or series
- Sparkline: \`data={[1,2,3]}\` — flat number array
- NumberFormatter: \`<NumberFormatter value={data.price} thousandSeparator prefix="$" />\`

### Pokédex with SubFetch Drill-Down (full example)
API: \`https://pokeapi.co/api/v2/pokemon?limit=50\`
\`\`\`jsx
<Stack gap="sm" p="xs">
  <Group justify="space-between">
    <Title order={3}>Pokédex</Title>
    <Badge size="lg" color="red">{data.count} Pokémon</Badge>
  </Group>
  <PaginatedList pageSize={8}>
    {data.results.map((pokemon, i) =>
      <Card withBorder p="xs" mb="xs">
        <Group wrap="nowrap" justify="space-between">
          <Group wrap="nowrap" gap="sm">
            <Avatar
              src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + String(i + 1) + ".png"}
              size="lg"
              radius="sm"
            />
            <Stack gap={0}>
              <Text fw={700} tt="capitalize">{pokemon.name}</Text>
              <Text size="xs" c="dimmed">#{String(i + 1).padStart(3, "0")}</Text>
            </Stack>
          </Group>
          <SubFetch
            url={pokemon.url}
            definitionId={definitionId}
            trigger="popover"
            buttonLabel="Details"
            width={400}
            template='<Stack gap="xs" p="xs"><Group wrap="nowrap"><Avatar src={data.sprites.front_default} size={64} radius="sm" /><Stack gap={4} style={{flex:1}}><Title order={4} tt="capitalize">{data.name}</Title><Text size="xs" c="dimmed">{data.height/10}m · {data.weight/10}kg</Text><Group gap="xs">{data.types.map(t => <TypeBadge type={t.type.name} />)}</Group></Stack></Group><Divider />{data.stats.map(s => <StatBar label={s.stat.name} value={s.base_stat} max={255} />)}<Collapsible title="Abilities"><Group gap="xs" pt="xs">{data.abilities.map(a => <Badge variant={a.is_hidden ? "outline" : "filled"} tt="capitalize">{a.ability.name}</Badge>)}</Group></Collapsible></Stack>'
          />
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
