import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";
import { customJsxAuthoringCatalog } from "./component-catalog";
import { customJsxExamples } from "./examples";

export const CUSTOM_WIDGET_MANTINE_VERSION = customJsxAuthoringCatalog.mantineVersion;
const CUSTOM_WIDGET_AI_PROMPT_LIMIT = 12_000;

export const CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION =
  "Return exactly one complete `json` fenced block followed by one complete `jsx` fenced block. Do not include prose outside those blocks.";

const RECOMMENDED_COMPONENTS = [
  "Stack",
  "Group",
  "SimpleGrid",
  "Grid",
  "Box",
  "Center",
  "Paper",
  "Card",
  "Card.Section",
  "ScrollArea",
  "Text",
  "Title",
  "Badge",
  "Alert",
  "Progress",
  "RingProgress",
  "ThemeIcon",
  "Indicator",
  "Avatar",
  "Image",
  "Divider",
  "Skeleton",
  "Loader",
  "Table",
  "Tabs",
  "Tabs.List",
  "Tabs.Tab",
  "Tabs.Panel",
  "Accordion",
  "TextInput",
  "NumberInput",
  "Select",
  "MultiSelect",
  "Switch",
  "Checkbox",
  "Radio",
  "Radio.Group",
  "Radio.Card",
  "Radio.Indicator",
  "Slider",
  "SegmentedControl",
  "Button",
  "ActionIcon",
  "Tooltip",
  "Popover",
  "Calendar",
  "AreaChart",
  "BarChart",
  "LineChart",
  "DonutChart",
] as const;

const leanShape = `{
  "$schema": "homarr-custom-widget-v2",
  "name": "Widget name",
  "description": "Optional summary",
  "sources": {
    "default": { "name": "API", "baseUrl": "https://api.example.com", "networkScope": "public", "auth": "none" }
  },
  "requests": {
    "items": { "path": "/items/{option:category}", "query": { "limit": { "$option": "limit" } } },
    "update": { "kind": "action", "method": "POST", "path": "/items/{param:id}", "invalidates": ["items"] }
  },
  "options": {
    "category": { "label": "Category", "control": "text", "default": "all" },
    "limit": { "label": "Result limit", "control": "number", "default": 20, "min": 1, "max": 100 }
  },
  "template": "__HOMARR_TEMPLATE__"
}`;

function compactExample(index: number) {
  const example = customJsxExamples[index];
  if (!example) return "";
  const { template, ...manifest } = example.widget;
  return `Example — ${example.title}:\n\n\`\`\`json\n${JSON.stringify({ ...manifest, template: "__HOMARR_TEMPLATE__" }, null, 2)}\n\`\`\`\n\n\`\`\`jsx\n${template}\n\`\`\``;
}

const AUTHORING_PROMPT = `You are writing one safe Homarr Custom JSX v2 dashboard widget for Mantine ${CUSTOM_WIDGET_MANTINE_VERSION}.

Manifest contract:
${leanShape}

Sources are keyed by name and must include "default". Auth is "none", "bearer", "basic", {"type":"apiKeyHeader","name":"X-Api-Key"}, or {"type":"apiKeyQuery","name":"api_key"}. Use the stable public API URL for public services and a clear suggested URL for self-hosted services; Homarr asks the installer for their own server URL. Never put credentials in the manifest.

Requests are keyed by ID. Defaults are source "default", kind "query", method "GET", query trigger "load", inherited auth, and permission "view" for queries or "modify" for actions. Actions are always manual. DELETE requires full permission and receives confirmation automatically. Use {option:name} or {"$option":"name"} for saved options. Use {param:name} or {"$param":"name"} only for invocation-time params supplied by SubFetch, ActionButton, or ToggleSwitch. Load queries cannot use params. Values and primitive types are inferred from references; do not declare parameters or option bindings. Paths and query values must be primitive; JSON bodies may bind structured options.

Options are keyed by name. Every option has label, control, and default. Controls: text, textarea, number, switch, select, multiSelect, slider, date, time, color, icon, url, duration, timeZone, json. Select choices use \`"choices": [{"label":"...","value":"..."}]\`. Dynamic choices must use \`"choicesFrom": {"request":"requestId","itemsPath":"optional.path","valuePath":"id","labelPath":"name"}\`, never an object under \`choices\`. Options are configured outside the widget and read through \`options.name\`; a bound control writes only to \`inputs.name\` and never changes an option.

JSX reads data.requestId, status.requestId, options.name, and temporary inputs.name. A status has loading, ok, status, statusText, and error. Use bind="search" on supported controls and inputs.search in params. SubFetch invokes a manual query. With trigger="manual", it renders its own load button; pass a card or image as triggerContent with triggerAriaLabel to make that content launch the request. Never author onClick or a fetch callback. Its child callback is (result, meta), where meta has ok, status, statusText, loading=false, and no error because SubFetch renders loading/error states itself. Use expression callbacks for map, filter, sort, and SubFetch. Do not use imports, hooks, refs, raw HTML, event callbacks, fetch, eval, bigint, npm packages, authored const blocks, IIFEs, or recursion. Regex is only for bounded string matching/replacement. Do not embed secrets.

Hard syntax rule: never write \`=> {\` anywhere. Every callback must be one concise expression, for example \`items.map(item => <Card key={item.id}>...</Card>)\`. Inline derived values directly, even when that repeats a short expression. Never use an IIFE to create local variables or branch; use JSX ternaries instead. Callback parameter names must not shadow the reserved roots \`data\`, \`status\`, \`options\`, or \`inputs\`.

Use only API routes grounded in the user request, documentation, or verified API notes. When a requested mutation is undocumented, omit it and explain the limitation through the widget design rather than inventing an endpoint.

Recommended components: ${RECOMMENDED_COMPONENTS.join(", ")}. This list is not exhaustive. Standard Mantine compound names are encouraged. Runtime helpers: RefreshButton, SubFetch, ActionButton, ToggleSwitch, and <Icon name="tabler-icon-name" />.

Make the result genuinely attractive: establish clear visual hierarchy, use deliberate spacing, restrained semantic color, responsive layouts, and theme-safe colors. Prefer one strong primary surface over excessive nested cards. Include useful loading, empty, error, and success states. Make narrow and wide tiles both work.

Visual quality bar:
- Give the widget a purposeful header with title, useful context, and its primary status or action.
- When the data supports it, lead with 2–4 scannable summary metrics before detailed rows.
- Use responsive SimpleGrid/Grid column objects and let long content wrap on narrow tiles.
- Use theme tokens and semantic Mantine colors; avoid hard-coded light backgrounds and decorative gradients.

${compactExample(0)}

${compactExample(1)}

Output the manifest with template set exactly to "__HOMARR_TEMPLATE__", then put the complete template in the JSX block.`;

export const CUSTOM_WIDGET_AUTHORING_PROMPT = AUTHORING_PROMPT;

export const CUSTOM_WIDGET_MCP_AUTHORING_PROMPT = `Author one Homarr Custom JSX v2 widget at a time.

Read the live schema and only the component resources needed for the design. Construct a credential-free widget, validate it, create a preview, test queries and simulated actions, visually inspect it, then create it. Configure deployment-specific source URLs and request credentials through Homarr when needed; never repeat plaintext. The live resources are authoritative for this Homarr release.

Use the lean keyed sources, requests, and options contract. Bind saved values directly with $option and invocation values with $param. Load queries cannot use $param. Keep the design responsive, accessible, theme-safe, loading-aware, empty-aware, and error-aware.

Use Workshop search/get/install when the user asks for an existing community widget. After installation, configure self-hosted source URLs and credentials with the dedicated source configuration tool or a secure user configuration request.`;

export function buildCustomWidgetMcpPrompt(request?: string | null, documentationUrl?: string | null) {
  const sections = [CUSTOM_WIDGET_MCP_AUTHORING_PROMPT];
  if (documentationUrl) sections.push(`API documentation: ${redactUrl(documentationUrl)}`);
  if (request?.trim()) sections.push(`User request: ${redactText(request.trim())}`);
  return sections.join("\n\n");
}

export function buildCustomWidgetAiPrompt(
  _jsonSchema?: unknown,
  rawResponse?: string | null,
  currentConfig?: Partial<HomarrCustomWidgetV2> | Record<string, unknown> | null,
  request?: string | null,
  documentationUrl?: string | null,
) {
  const sections = [
    `Create this Homarr Custom JSX v2 widget:\n\n${truncatePromptText(redactText(request?.trim() || "Describe the widget you want to create."), 1_500)}`,
  ];
  if (documentationUrl) sections.push(`API documentation: ${truncatePromptText(redactUrl(documentationUrl), 500)}`);
  sections.push(AUTHORING_PROMPT);

  const optionalSections = [
    ...(rawResponse ? [{ label: "Sample API response", content: redactResponse(rawResponse) }] : []),
    ...(currentConfig
      ? [{ label: "Current widget", content: JSON.stringify(redactValue(currentConfig), null, 2) }]
      : []),
  ];
  for (const section of optionalSections) {
    const remaining =
      CUSTOM_WIDGET_AI_PROMPT_LIMIT - sections.join("\n\n").length - CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION.length - 8;
    const formatted = formatBudgetedCodeSection(section.label, section.content, remaining);
    if (formatted) sections.push(formatted);
  }
  const footer = `\n\n${CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION}`;
  return `${truncatePromptText(sections.join("\n\n"), CUSTOM_WIDGET_AI_PROMPT_LIMIT - footer.length)}${footer}`;
}

const sensitiveKey =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;

function redactValue(value: unknown, key = ""): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => [entryKey, redactValue(entry, entryKey)]),
    );
  if (typeof value === "string") {
    if (["sources", "requests", "options"].includes(key)) {
      try {
        return redactValue(JSON.parse(value) as unknown);
      } catch {
        /* Keep invalid editor JSON useful. */
      }
    }
    return key === "baseUrl" || key === "iconUrl" ? redactUrl(value) : redactText(value);
  }
  return value;
}

function redactResponse(value: string) {
  try {
    return JSON.stringify(redactValue(JSON.parse(value) as unknown), null, 2);
  } catch {
    return truncatePromptText(redactText(value), 1_500);
  }
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[REDACTED_URL]";
  }
}

function redactText(value: string): string {
  return value
    .replace(/\bhttps?:\/\/[^\s"'<>]+/giu, (candidate) => redactUrl(candidate))
    .replace(/\b(authorization\s*:\s*bearer)\s+[^\s,;]+/giu, "$1 [REDACTED]")
    .replace(
      /\b(api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|token|password|passwd|secret)["']?\s*[:=]\s*["']?[^\s,;"'}]+/giu,
      "$1: [REDACTED]",
    );
}

function formatBudgetedCodeSection(label: string, content: string, budget: number): string | null {
  const prefix = `${label}:\n\n\`\`\`json\n`;
  const suffix = "\n```";
  if (budget <= prefix.length + suffix.length + 80) return null;
  return `${prefix}${truncatePromptText(content, budget - prefix.length - suffix.length)}${suffix}`;
}

function truncatePromptText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const marker = "\n... [content omitted to fit the prompt budget]";
  return `${value.slice(0, Math.max(0, limit - marker.length))}${marker}`;
}
