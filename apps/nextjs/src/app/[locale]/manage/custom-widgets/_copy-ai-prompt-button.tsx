"use client";

import { Button, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconSparkles } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showSuccessNotification } from "@homarr/notifications";
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
    await navigator.clipboard.writeText(prompt);
    close();
    showSuccessNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopied") });
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
