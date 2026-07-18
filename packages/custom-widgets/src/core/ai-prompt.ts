import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

export const CUSTOM_WIDGET_MANTINE_VERSION = "9.4.1";

const AUTHORING_PROMPT = `You create Homarr Custom JSX v2 widgets. Return exactly two fenced blocks: a json block containing one complete widget object with template set to "__HOMARR_TEMPLATE__", then a jsx block containing the readable template.

Use $schema "homarr-custom-widget-v2". A widget contains metadata, inline API sources, named requests, an options schema, defaults, optional local state, and one JSX template. Never include credentials. Use one source named "default" unless the widget genuinely combines APIs.

This Homarr release uses Mantine ${CUSTOM_WIDGET_MANTINE_VERSION}. When connected, read homarr://custom-widgets/schema and homarr://custom-widgets/components instead of guessing the installed surface.

Queries and actions may use GET, POST, PUT, PATCH, or DELETE. Set kind to query for reads and action for user-triggered changes. Actions never use trigger "load". Declare every path, query, or body parameter. Use {name} in paths and {"$param":"name"} in query/body templates. Use SubFetch for manual queries, ActionButton or ToggleSwitch for actions, and load-triggered queries through data.<requestId>.

Source authentication is exactly one of {"type":"none"}, {"type":"bearer"}, {"type":"basic"}, {"type":"apiKeyHeader","headerName":"X-API-Key"}, or {"type":"apiKeyQuery","parameterName":"api_key"}. Credentials are configured separately by the user.

Templates can read data, status, options, and state. Bind supported Mantine controls with bind="stateName" instead of event handlers. Use Mantine Core, Dates, and Charts components. Do not use imports, hooks, refs, event callbacks, component/renderRoot, arbitrary portals, raw HTML, fetch, eval, npm packages, or credentials. Design for compact and wide dashboard sizes with useful loading, empty, and error states.

Options use a restricted object JSON Schema. x-homarr controls include text, textarea, number, switch, select, multi-select, slider, date, time, color, icon, url, duration, timeZone, and json. Dynamic selects use x-homarr.optionsSource with requestId, optional itemsPath for wrapped arrays, valuePath, and labelPath. Local state types are string, number, boolean, date, string[], number[], or date[].

Widget shape:
{ "$schema":"homarr-custom-widget-v2", "name":"...", "description":"...", "iconUrl":"https://...", "sources":[{ "id":"default", "name":"API", "baseUrl":"https://host", "networkScope":"public|private|loopback", "auth":{ "type":"none|bearer|basic|apiKeyHeader|apiKeyQuery" } }], "requests":[{ "id":"data", "sourceId":"default", "kind":"query|action", "method":"GET|POST|PUT|PATCH|DELETE", "pathTemplate":"/api/path", "parameters":{}, "queryTemplate":{}, "bodyTemplate":{}, "auth":"inherit|none", "minimumBoardPermission":"view|modify|full", "trigger":"load|manual", "confirmation":{ "title":"...", "message":"...", "destructive":false }, "invalidates":[] }], "optionsSchema":{ "type":"object", "properties":{}, "additionalProperties":false }, "defaultOptions":{}, "stateSchema":{}, "defaultState":{}, "template":"__HOMARR_TEMPLATE__" }

Keep the result concise, accessible, responsive, and valid. Preserve unrelated fields when fixing an existing widget.`;

export const CUSTOM_WIDGET_AUTHORING_PROMPT = AUTHORING_PROMPT;

export const CUSTOM_WIDGET_MCP_AUTHORING_PROMPT = `Author one Homarr Custom JSX v2 widget at a time. Repeat this workflow independently when the user asks for several widgets.

1. Read homarr://custom-widgets/schema, homarr://custom-widgets/components, and homarr://custom-widgets/skill.
2. Read the external API documentation and construct one credential-free homarr-custom-widget-v2 document.
3. Call customWidget_validate before saving, then customWidget_previewCreate.
4. Test queries with customWidget_previewQuery and actions with customWidget_previewAction. Actions are simulated until the user explicitly enables live preview actions.
5. Open the preview URL, inspect customWidget_previewJournal, and iterate with customWidget_templatePatch or another preview session.
6. Use customWidget_secretSet only for a credential the user supplied and only with dedicated permission. Otherwise call customWidget_secretRequestUser and poll its completion status; never receive or repeat the plaintext.
7. Call customWidget_create only after validation, request tests, action simulation, and visual inspection pass.

Use inline sources, named queries/actions, restricted JSON Schema options, session-local typed state, declarative bind controls, and safe Mantine JSX. Use kind, not method, to distinguish reads from user-triggered changes. Never include credentials, imports, hooks, refs, callbacks, browser requests, arbitrary JavaScript, npm packages, polymorphic roots, or arbitrary portals. Make the widget responsive, accessible, loading-aware, empty-aware, and error-aware. The live schema and component resources are authoritative for the installed Homarr release.`;

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
  const sections = [AUTHORING_PROMPT];
  if (documentationUrl) sections.push(`API documentation: ${redactUrl(documentationUrl)}`);
  sections.push(`Requested widget: ${redactText(request?.trim() || "Describe the widget you want to create.")}`);
  if (rawResponse) sections.push(`Sample API response:\n\n\`\`\`json\n${redactResponse(rawResponse)}\n\`\`\``);
  if (currentConfig) {
    sections.push(`Current widget:\n\n\`\`\`json\n${JSON.stringify(redactValue(currentConfig), null, 2)}\n\`\`\``);
  }
  return sections.join("\n\n").slice(0, 8_000);
}

export function buildCustomWidgetFixPrompt(input: {
  currentConfig: Partial<HomarrCustomWidgetV2> | Record<string, unknown>;
  request?: string | null;
  documentationUrl?: string | null;
  diagnostics: string;
  journal: unknown;
}) {
  const sections = [AUTHORING_PROMPT];
  if (input.documentationUrl) sections.push(`API documentation: ${redactUrl(input.documentationUrl)}`);
  sections.push(`Original request: ${redactText(input.request?.trim() || "Fix the current widget.")}`);
  sections.push(`Current widget:\n\n\`\`\`json\n${JSON.stringify(redactValue(input.currentConfig), null, 2)}\n\`\`\``);
  sections.push(
    `Validation diagnostics:\n\n\`\`\`text\n${redactText(input.diagnostics) || "No static diagnostics."}\n\`\`\``,
  );
  sections.push(
    `Redacted request journal:\n\n\`\`\`json\n${JSON.stringify(redactValue(input.journal), null, 2)}\n\`\`\``,
  );
  return sections.join("\n\n");
}

const sensitiveKey =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;

function redactValue(value: unknown, key = ""): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => [entryKey, redactValue(entry, entryKey)]),
    );
  }
  if (typeof value === "string") {
    if (["sources", "requests", "optionsSchema", "defaultOptions", "stateSchema", "defaultState"].includes(key)) {
      try {
        return redactValue(JSON.parse(value) as unknown);
      } catch {
        // Keep invalid editor JSON useful while applying the text redactor below.
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
    return "[REDACTED_URL]";
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
