import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";
import { customJsxAuthoringCatalog } from "./component-catalog";

export const CUSTOM_WIDGET_MANTINE_VERSION = customJsxAuthoringCatalog.mantineVersion;
export const CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL = "--- END HOMARR CUSTOM WIDGET OFFLINE BUNDLE ---";
const CUSTOM_WIDGET_AI_PROMPT_LIMIT = 8_000;
export const CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION =
  "Create the requested widget now and return exactly one complete `json` fenced block followed by one complete `jsx` fenced block. Homarr will validate the result after it is pasted into the workbench.";

const AUTHORING_PROMPT = `You create Homarr Custom JSX v2 widgets. Return exactly two fenced blocks: a json block containing one complete widget object with template set to "__HOMARR_TEMPLATE__", then a jsx block containing the readable template.

Use $schema "homarr-custom-widget-v2". A widget contains metadata, inline API sources, named requests, an options schema, defaults, and one JSX template. Never include credentials. Use one source named "default" unless the widget genuinely combines APIs.

This Homarr release uses Mantine ${CUSTOM_WIDGET_MANTINE_VERSION}. Use only the Homarr runtime components and Mantine capabilities described in this prompt. The embedded-skill variant includes the complete release-matched skill, widget schema, component catalog, and canonical examples for self-contained offline authoring.

Queries and actions may use GET, POST, PUT, PATCH, or DELETE. Set kind to query for reads and action for user-triggered changes. Actions never use trigger "load". Declare every path, query, or body parameter. Use {name} in paths and {"$param":"name"} in query/body templates. Every declared parameter needs an explicit value source: SubFetch, ActionButton, and ToggleSwitch supply manual request values through their params prop; every load-query parameter must have an optionsBinding entry containing {"$option":"optionName"} or a primitive literal. Never infer a binding from matching names. Use load-triggered query results through data.<requestId>.

Source authentication is exactly one of {"type":"none"}, {"type":"bearer"}, {"type":"basic"}, {"type":"apiKeyHeader","headerName":"X-API-Key"}, or {"type":"apiKeyQuery","parameterName":"api_key"}. Credentials are configured separately by the user.

Templates can read data, status, options, and inputs. Each status.<requestId> is an object shaped { loading: boolean, ok?: boolean, status?: number, statusText?: string, error?: string }; never compare it with the strings "loading", "success", or "error". Use status.list?.loading while loading, status.list?.ok === false for failure, and status.list?.ok === true for success. Bind supported Mantine controls with bind="search" and read the temporary value as inputs.search. Bound inputs live only in memory and reset when the widget reloads; saved configuration belongs in options. Restricted callback blocks may declare immutable local const values followed by one final return. Use RecursiveList for arbitrary-depth trees instead of authored recursion. Use Mantine Core, Dates, and Charts components. Do not use imports, hooks, refs, raw event callback props, component/renderRoot, arbitrary portals, raw HTML, fetch, eval, npm packages, or credentials. Design for compact and wide dashboard sizes with useful loading, empty, and error states.

Options use a restricted object JSON Schema. x-homarr controls include text, textarea, number, switch, select, multi-select, slider, date, time, color, icon, url, duration, timeZone, and json. Dynamic selects use x-homarr.optionsSource with requestId, optional itemsPath for wrapped arrays, valuePath, and labelPath.

Widget shape:
{ "$schema":"homarr-custom-widget-v2", "name":"...", "description":"...", "iconUrl":"https://...", "sources":[{ "id":"default", "name":"API", "baseUrl":"https://host", "networkScope":"public|private|loopback", "auth":{ "type":"none|bearer|basic|apiKeyHeader|apiKeyQuery" } }], "requests":[{ "id":"data", "sourceId":"default", "kind":"query", "method":"GET", "pathTemplate":"/api/{id}", "parameters":{ "id":"string", "limit":"number" }, "optionsBinding":{ "id":{ "$option":"resourceId" }, "limit":20 }, "queryTemplate":{ "limit":{ "$param":"limit" } }, "auth":"inherit", "minimumBoardPermission":"view", "trigger":"load" }], "optionsSchema":{ "type":"object", "properties":{ "resourceId":{ "type":"string" } }, "required":["resourceId"], "additionalProperties":false }, "defaultOptions":{ "resourceId":"example" }, "template":"__HOMARR_TEMPLATE__" }

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

Use inline sources, named queries/actions, restricted JSON Schema options, temporary declarative bind controls exposed through inputs, and safe Mantine JSX. Every load-query parameter needs an explicit optionsBinding option reference or literal; manual queries and actions receive all parameters from the invoking component's params prop. Never infer sources from matching names. Each status.<requestId> is an object with loading, ok, status, statusText, and error fields; never compare it with "loading", "success", or "error". Use kind, not method, to distinguish reads from user-triggered changes. Never include credentials, imports, hooks, refs, callbacks, browser requests, arbitrary JavaScript, npm packages, polymorphic roots, or arbitrary portals. Make the widget responsive, accessible, loading-aware, empty-aware, and error-aware. The live schema and component resources are authoritative for the installed Homarr release.`;

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
  const requestedWidget = truncatePromptText(
    redactText(request?.trim() || "Describe the widget you want to create."),
    1_500,
  );
  const sections = [`Please create this Homarr Custom JSX v2 widget:\n\n${requestedWidget}`];
  if (documentationUrl) sections.push(`API documentation: ${truncatePromptText(redactUrl(documentationUrl), 500)}`);
  sections.push(AUTHORING_PROMPT);
  sections.push(CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION);

  const optionalSections = [
    ...(rawResponse ? [{ label: "Sample API response", content: redactResponse(rawResponse) }] : []),
    ...(currentConfig
      ? [{ label: "Current widget", content: JSON.stringify(redactValue(currentConfig), null, 2) }]
      : []),
  ];
  for (const [index, section] of optionalSections.entries()) {
    const remainingSections = optionalSections.length - index;
    const remainingCharacters = CUSTOM_WIDGET_AI_PROMPT_LIMIT - sections.join("\n\n").length - 2;
    const sectionBudget = Math.floor(remainingCharacters / remainingSections);
    const formatted = formatBudgetedCodeSection(section.label, section.content, sectionBudget);
    if (formatted) sections.splice(-1, 0, formatted);
  }

  return sections.join("\n\n");
}

export function finalizeCustomWidgetOfflineContent(content: string) {
  const footerPrefix = `${content.trimEnd()}\n\n${CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL}\nCharacters: `;
  let digitCount = String(footerPrefix.length).length;
  while (true) {
    const characterCount = footerPrefix.length + digitCount;
    const countText = String(characterCount);
    if (countText.length === digitCount) return `${footerPrefix}${countText}`;
    digitCount = countText.length;
  }
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
    if (["sources", "requests", "optionsSchema", "defaultOptions"].includes(key)) {
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

function formatBudgetedCodeSection(label: string, content: string, budget: number): string | null {
  const prefix = `${label}:\n\n\`\`\`json\n`;
  const suffix = "\n```";
  if (budget <= prefix.length + suffix.length + 80) return null;
  const contentBudget = budget - prefix.length - suffix.length;
  return `${prefix}${truncatePromptText(content, contentBudget)}${suffix}`;
}

function truncatePromptText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const marker = "\n... [content omitted to fit the prompt budget]";
  return `${value.slice(0, Math.max(0, limit - marker.length))}${marker}`;
}
