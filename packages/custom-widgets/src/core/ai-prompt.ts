import { customJsxExamples } from "./examples";
import { enabledCustomJsxComponents } from "./component-registry";

const PROMPT_HEADER = `You are configuring a Homarr custom widget. Ask a concise clarifying question only when the requested behavior is ambiguous.

For Custom JSX, return a Homarr authoring bundle with exactly two fenced code blocks:
1. A \`json\` block containing the complete import object. Set \`displayConfig.template\` to \`"__HOMARR_TEMPLATE__"\`.
2. A \`jsx\` block containing the readable, multiline template with no JSON escaping.

The user can paste both blocks together into Homarr. Homarr combines and validates them before import. For non-Custom-JSX display types, return only the complete JSON block.

## Rules
- Use \`"$schema": "homarr-custom-widget-v3"\`.
- \`displayType\` and \`displayConfig.type\` must match.
- Prefer \`customJsx\` with \`jsxApiVersion: 2\` for custom layouts.
- The base widget request must use GET. Mutations belong in named action requests.
- JSX cannot call \`fetch\` or use event handlers. Use SubFetch, ActionButton, ToggleSwitch, and RefreshButton.
- Version 2 network components reference a literal \`requestId\` and pass only declared \`params\`.
- SubFetch can reference query requests only. ActionButton and ToggleSwitch can reference action requests only.
- Prefer the SubFetch function-as-children API for fetched data. The callback receives \`(response, metadata)\` and may return any safe JSX tree. Use SubData only for very small path-based displays.
- SubFetch owns loading, failure, retry, cancellation, and stale-response handling. The render callback runs only when response data is available.
- Named request paths are same-origin paths beginning with \`/\`. Do not put credentials in a template or export.
- Query requests use GET and view permission. POST, PUT, and PATCH actions default to modify. DELETE requires full permission and confirmation.
- Use only components in the generated component reference below.
- Template output must fit inside a dashboard widget and remain usable at narrow widths.
- Return the complete import object, not a template fragment. Preserve unrelated fields from the current configuration.
- Include stable keys for rendered collections, accessible labels for controls and images, useful empty states, and concise content that works in light and dark themes.
- Prefer one clear information hierarchy over nested cards. Use ActionButton and ToggleSwitch only when the named action and required permission are declared.

## Named request shape
\`\`\`ts
interface CustomJsxRequest {
  id: string;
  kind: "query" | "action";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathTemplate: \`/\${string}\`;
  parameters: Record<string, "string" | "number" | "boolean">;
  bodyTemplate?: unknown;
  staticHeaders?: Record<string, string>;
  auth: "inherit" | "none";
  minimumBoardPermission: "view" | "modify" | "full";
  cacheTtlSeconds?: number;
}
\`\`\`

Path parameters use \`{name}\`. JSON body parameters use \`{ "$param": "name" }\` and preserve the declared type.

## SubFetch rendering
Use a render child when a named query needs its own layout:

\`\`\`jsx
<SubFetch requestId="service-detail" params={{ id: data.serviceId }}>
  {(detail, meta) =>
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={700}>{detail.name}</Text>
        <Badge color={meta.ok ? "green" : "red"}>HTTP {meta.status}</Badge>
      </Group>
      {detail.metrics.map((metric) =>
        <Group key={metric.name} justify="space-between">
          <Text size="sm">{metric.name}</Text>
          <Text fw={600}>{metric.value}</Text>
        </Group>
      )}
    </Stack>
  }
</SubFetch>
\`\`\`

The callback is an interpreter-managed inline arrow function. Do not use native callbacks, event handlers, global state, or direct network access. Keep list keys stable and design for narrow and wide widget sizes.
`;

const PROMPT_NO_RESPONSE = `No sample response is available. Leave this marker in your reasoning and ask the user for a representative response if its shape is required:

\`\`\`json
PASTE_API_RESPONSE_HERE
\`\`\`
`;

function buildComponentReference() {
  const categories = new Map<string, string[]>();
  for (const component of enabledCustomJsxComponents) {
    const names = categories.get(component.category) ?? [];
    names.push(component.name);
    categories.set(component.category, names);
  }

  return [...categories.entries()].map(([category, names]) => `- ${category}: ${names.join(", ")}`).join("\n");
}

function buildExamples() {
  return customJsxExamples
    .map(
      (example) => `### ${example.title}
${example.description}
\`\`\`json
${JSON.stringify(
  {
    displayType: "customJsx",
    displayConfig: {
      type: "customJsx",
      jsxApiVersion: 2,
      networkScope: "public",
      template: "__HOMARR_TEMPLATE__",
      requests: example.requests,
    },
  },
  null,
  2,
)}
\`\`\`
\`\`\`jsx
${example.template}
\`\`\``,
    )
    .join("\n\n");
}

export function buildCustomWidgetAiPrompt(
  jsonSchema: unknown,
  rawResponse?: string | null,
  currentConfig?: Record<string, unknown> | null,
) {
  const responseSection = rawResponse
    ? `## API response\n\n\`\`\`json\n${rawResponse}\n\`\`\`\n`
    : `## API response\n\n${PROMPT_NO_RESPONSE}`;
  const currentDisplayConfig = currentConfig?.displayConfig;
  const currentTemplate =
    currentDisplayConfig && typeof currentDisplayConfig === "object" && "template" in currentDisplayConfig
      ? currentDisplayConfig.template
      : null;
  const readableCurrentConfig = currentConfig
    ? {
        ...currentConfig,
        ...(currentTemplate && typeof currentTemplate === "string"
          ? {
              displayConfig: {
                ...(currentDisplayConfig as Record<string, unknown>),
                template: "__HOMARR_TEMPLATE__",
              },
            }
          : {}),
      }
    : null;
  const configSection = readableCurrentConfig
    ? `## Current configuration\n\nUse this as the starting point and preserve unrelated settings.\n\n\`\`\`json\n${JSON.stringify(readableCurrentConfig, null, 2)}\n\`\`\`\n${typeof currentTemplate === "string" ? `\n\`\`\`jsx\n${currentTemplate}\n\`\`\`\n` : ""}`
    : "";

  return `${PROMPT_HEADER}
## Import schema
The \`__HOMARR_TEMPLATE__\` value is an authoring transport placeholder. Homarr replaces it with the following JSX block before schema and AST validation.

\`\`\`json
${JSON.stringify(jsonSchema, null, 2)}
\`\`\`

## Generated component reference
${buildComponentReference()}

## Tested examples
${buildExamples()}

${responseSection}
${configSection}
## Requested widget
Describe what the widget should show and which interactions it needs:
`;
}
