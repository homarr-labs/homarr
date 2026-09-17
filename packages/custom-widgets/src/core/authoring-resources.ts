export {
  findCustomWidgetComponents,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetExample,
  getCustomWidgetExampleCatalog,
  getCustomWidgetSharedProps,
} from "./authoring-catalog";

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_VERSION = "2.10.0";
export const CUSTOM_WIDGET_SKILL_REFERENCE_NAMES = ["schema", "runtime", "security"] as const;
export type CustomWidgetSkillReferenceName = (typeof CUSTOM_WIDGET_SKILL_REFERENCE_NAMES)[number];

const reloadableCustomWidgetContextToolNames = new Set([
  "customWidget_getReference",
  "customWidget_findComponents",
  "customWidget_getComponents",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_getExample",
]);

export function getCustomWidgetContextRequestKey(toolName: string, input: unknown) {
  if (!reloadableCustomWidgetContextToolNames.has(toolName)) return null;
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return `${toolName}:${JSON.stringify(input)}`;
  const normalizedInput: Record<string, unknown> = {};
  for (const key of Object.keys(input).toSorted()) {
    const value = (input as Record<string, unknown>)[key];
    if (key === "names" && Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      normalizedInput[key] = [...new Set(value)].toSorted();
      continue;
    }
    normalizedInput[key] = value;
  }
  return `${toolName}:${JSON.stringify(normalizedInput)}`;
}

export const CUSTOM_WIDGET_SKILL_REFERENCES = {
  "references/schema.md": `# Schema

\`\`\`ts
interface HomarrCustomWidgetV2 {
  $schema: "homarr-custom-widget-v2";
  name: string;
  description?: string;
  iconUrl?: string;
  sources: Record<string, CustomWidgetSource>;
  requests: Record<string, CustomWidgetRequest>;
  options?: Record<string, CustomWidgetOption>;
  template: string;
}
\`\`\`

The object key \`default\` is the required source ID; \`default\` is not a property on a source. Source properties are \`name?\`, \`baseUrl\`, \`networkScope\`, and \`auth?\`:

\`\`\`json
{
  "sources": {
    "default": {
      "name": "Service",
      "baseUrl": "http://service.local:5055/api/v1",
      "networkScope": "private",
      "auth": { "type": "apiKeyHeader", "name": "X-Api-Key" }
    }
  },
  "requests": {
    "summary": { "path": "/summary" },
    "search": { "trigger": "manual", "path": "/search", "query": { "q": { "$param": "query" } } },
    "create": {
      "kind": "action",
      "method": "POST",
      "path": "/items",
      "body": { "id": { "$param": "id" } },
      "confirmation": "Create this item?",
      "invalidates": ["search"]
    }
  }
}
\`\`\`

Auth is \`none\`, \`bearer\`, \`basic\`, \`{ "type": "apiKeyHeader", "name": "X-Api-Key" }\`, or \`{ "type": "apiKeyQuery", "name": "api_key" }\`. A request defaults to source \`default\`, kind \`query\`, method \`GET\`, trigger \`load\`, inherited auth, and view permission. Set \`trigger: "manual"\` for a parameterized query. An action defaults to manual and modify permission. DELETE uses full permission and confirmation. Do not use \`load: false\`.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Paths use \`{option:name}\` and \`{param:name}\`; query/body references use \`{ "$option": "name" }\` and \`{ "$param": "name" }\`. Constants stay primitive (\`take: 10\`); \`$param\` is only for manual helpers, never load queries. Names and types are inferred.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.
`,
  "references/runtime.md": `# Runtime

Templates read \`data.requestId\`, \`status.requestId\`, \`options.name\`, and temporary \`inputs.name\`. Status is \`{ loading, ok, status, statusText, error }\`. Render load queries directly from \`data\` and \`status\` with \`RefreshButton\`; never wrap them in \`SubFetch\`.

\`bind="search"\` creates an in-memory input. It is never persisted. Supply invocation values only through \`params\`, for example:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<Pagination bind="page" resetKey={inputs.search} defaultValue={1} total={5} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

Manual queries require \`trigger: "manual"\` on request and \`SubFetch\`; otherwise they run automatically. \`triggerContent\` with \`triggerAriaLabel\` makes custom content the launcher. \`SubFetch\` owns loading/error/retry; its child receives success plus \`{ ok, status, statusText, loading: false }\`. Never author \`onClick\` or fetch callbacks.

\`SubFetch\`, \`ActionButton\`, and \`ToggleSwitch\` need literal \`requestId\`; validation rejects missing/computed IDs.

Inside a successful manual result, \`<RefreshButton requestId="search" label="Run again" />\` reruns the same parameters.

When a manual SubFetch request ID, parameters, or effective definition changes, Homarr immediately hides its prior result and returns to the trigger. It cannot fetch the new parameters until the user triggers it again.

The \`SubFetch\` callback receives the entire JSON response exactly as previewed. If the response is \`{ "results": [...] }\`, render and map \`result.results\`; never map the envelope itself. Trace every rendered field from the preview response before persistence.

Format timestamps with safe static helpers; never use \`new Date\`. Never invent a formatter component. Use \`Date.toLocaleString(value, "en-US", "UTC")\` plus a visible \`UTC\` label. Also available: \`Date.toISOString\`, \`Date.toLocaleDateString\`, and \`Date.toLocaleTimeString\`.

For compact numeric enums, index a literal label array with a fallback:

\`\`\`jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
\`\`\`

Every stateful control must use \`bind\`, and its \`inputs.<name>\` value must feed a supported request/helper when it is meant to change remote data. For dependent pagination, declare \`defaultValue={1}\` and use \`resetKey={inputs.search}\` to restore page 1 when the query changes. If a control cannot affect the workflow through a binding, option, or runtime helper, render concise context instead of a dead control.

Callback parameters must not shadow the reserved roots \`data\`, \`status\`, \`options\`, or \`inputs\`. Use \`<Icon name="refresh" />\` or \`<TablerIcon name="refresh" />\`; never invent components such as \`<IconFoo />\`.

Use expression callbacks for supported collections and trusted slots. No callback blocks, IIFEs, authored recursion, or raw events. Regex is limited to safe string operations.
`,
  "references/security.md": `# Security

All requests use Homarr's protected server executor. Source origin, network scope, DNS, redirects, SSRF, rate limits, permissions, size limits, timeouts, and encrypted credential injection remain enforced.

The JSX interpreter blocks imports, hooks, refs, raw event callbacks, browser requests, eval, arbitrary functions, prototype access, unsafe URLs, global CSS escape, arbitrary portals, bigint, statement blocks, IIFEs, and recursion. Regex literals must be bounded and reject backreferences, lookbehind, nested quantifiers, excessive length, and unsupported flags.

Credentials are stored separately and never exported or returned to an agent. A published self-hosted source URL is only a suggestion: installers must confirm or replace private and loopback URLs for their own Homarr deployment. Source origins cannot be controlled through widget options.
`,
} as const;

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author one widget or a coordinated set. Finish each widget's evidence and persistence before starting the next; use one
shared research pass for a set. Finish with the artifact and a short evidence boundary.

## Choose the route

- Read primary API documentation once when it is missing or may have changed. Treat a supplied sample or successful
  preview response as the binding contract; load only the schema, runtime, security, or component context needed.
- Search for components once when a capability is unknown, then batch selected details. Reuse \`contextAlreadyLoaded\` and
  do not repeat an unavailable lookup.
- A provider/model rejection is a terminal call failure: record the provider, model, and valid-model error, then finish
  from loaded context. If lifecycle tools are unavailable, use the offline artifact route and mark it unverified.
- For a community widget, call \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, then
  \`customWidget_workshopInstall\`; configure its source securely. Preview configuration expires, so persist before it does.

## Artifact contract

For the current widget, return exactly one fenced \`json\` block; keep evidence prose outside the fence. The definition has
keyed \`sources\`, \`requests\`, a \`template\`, and optional \`options\` when needed. Actions are requests with \`kind: "action"\`;
there is no top-level \`actions\` field.

- \`sources.default\` has \`baseUrl\`, \`networkScope\` (\`public\`, \`private\`, or \`loopback\`), and credential-free \`auth\`.
  Auth is \`none\`, \`bearer\`, \`basic\`, or an \`apiKeyHeader\`/\`apiKeyQuery\` object containing only its \`name\`; Homarr holds
  the credential.
- Requests use a leading-slash \`path\`; declare \`source\`, \`method\`, and \`trigger\` when they differ from defaults. Load
  queries use \`trigger: "load"\`; manual parameterized queries and actions use \`trigger: "manual"\`.
- Read load data from \`data.requestId\`. Check \`status.requestId?.loading\` and \`status.requestId?.ok === false\`; guard
  arrays and nested fields and use \`??\` for truthful fallbacks. Render requested fields from the supplied contract.
- A load template shows loading, error, empty, and success states and includes \`RefreshButton requestId="..."\`.
  \`SubFetch\` is for requested manual parameterized queries; it owns loading/error/retry and receives \`(result, metadata)\`.
- Options have \`label\`, \`control\`, and \`default\`; bind with \`{option:name}\` or \`$option\`. A dependent control has its
  own default and \`resetKey={inputs.dependency}\`. Do not add lookup, pagination, or detail requests for omitted fields.
- Keep templates expression-only: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use named \`Icon\` or \`TablerIcon\`. Keep credentials and deployment values in
  Homarr configuration; never put tokens, keys, authorization values, or redacted credential placeholders in the manifest.

Minimum shape: include \`$schema\`, \`sources.default\`, \`requests\`, and \`template\`; actions live under \`requests\` with \`kind: "action"\`.

Use \`data.items?.map(item => ...)\` only after loading/error branches and provide a no-items branch. Label timestamps with
the source timezone when known. Keep hierarchy, imagery, actions, and narrow/wide layout purposeful; avoid dead controls.

## Bounded lifecycle

1. Build the credential-free definition from the request, verified context, and sample. Preserve a migration's API path,
   method, body, options, and visible behavior.
2. Call \`customWidget_validateTemplate\` for focused JSX diagnostics. Send source/request/option changes once to
   \`customWidget_previewCreate\`; use \`customWidget_previewReviseTemplate\` for a JSX-only correction in its session.
3. Test every returned query or simulated action once. After a validation failure, make one corrected candidate and
   revalidate. Stop when the result is incomplete, the workbench closes, or the provider/model rejects the call.
4. After a successful final preview and exact tests, call \`customWidget_createFromPreview\`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

For each lifecycle call, report only its actual result. If tools have no result, add one line after the artifact beginning
\`Unverified:\` naming the missing validation, preview, renderer, or persistence step. Do not claim rendering or persistence
from syntax or schema checks alone.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use release-matched tools and load only context required by the design. Research primary API documentation once. For each widget, validate JSX, create one preview, test every returned query and relevant simulated action, then persist that exact preview. A JSX-only correction uses \`customWidget_previewReviseTemplate\` with the session; it inherits the manifest and resets evidence.

Deliver the smallest complete result. Preserve a migration's API intent, request shape, and visible behavior; simple lists use one source, one request, and a compact template. Run each lifecycle call once; one validation failure may lead to one correction and revalidation. On provider/model, unavailable, \`contextAlreadyLoaded\`, or closed-workbench errors, stop retrying and reuse loaded context. If lifecycle tools cannot run, return one complete importable definition and one unverified note. Use the configured model exactly and keep updates to the result and next action.

Fallback artifact contract: emit one parseable \`json\` fence with \`sources.default.baseUrl\`, \`networkScope\`, and \`auth\`, leading-slash request paths, option \`control\`, and status checks such as \`status.id?.loading\` or \`status.id?.ok === true\`. Never compare \`status.id\` directly; keep the unverified note outside the fence. Templates read \`data.requestId\` and \`status.requestId\`.

Load \`schema\` once for a new manifest, \`runtime\` for manual interactions, and \`security\` once for authenticated sources or mutations. Use one focused component search per job, keep credentials outside definitions, and make initial, loading, empty, error, and success states useful. Independent context reads may run together; lifecycle tools run one at a time.`;

const CUSTOM_WIDGET_SKILL_BUNDLE_MD = [
  CUSTOM_WIDGET_SKILL_MD.trimEnd(),
  ...Object.entries(CUSTOM_WIDGET_SKILL_REFERENCES).map(
    ([file, content]) => `\n\n---\n\n# Bundled file: ${file}\n\n${content.trimEnd()}`,
  ),
].join("");

export function getCustomWidgetSkill() {
  return {
    name: "homarr-custom-widget",
    version: CUSTOM_WIDGET_SKILL_VERSION,
    skillMd: CUSTOM_WIDGET_SKILL_MD,
    references: CUSTOM_WIDGET_SKILL_REFERENCES,
    skillsShUrl: CUSTOM_WIDGET_SKILLS_SH_URL,
    sourceUrl: CUSTOM_WIDGET_SKILL_SOURCE_URL,
    installCommand: CUSTOM_WIDGET_SKILL_INSTALL_COMMAND,
  };
}

export function getCustomWidgetSkillEntrypoint() {
  return {
    name: "homarr-custom-widget",
    version: CUSTOM_WIDGET_SKILL_VERSION,
    skillMd: CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD,
    references: CUSTOM_WIDGET_SKILL_REFERENCE_NAMES.map((name) => ({
      name,
      tool: "customWidget_getReference" as const,
      toolInput: { name },
      resource: `homarr://custom-widgets/references/${name}`,
      httpResource: `/api/custom-widgets/reference-${name}`,
    })),
    skillsShUrl: CUSTOM_WIDGET_SKILLS_SH_URL,
    sourceUrl: CUSTOM_WIDGET_SKILL_SOURCE_URL,
    installCommand: CUSTOM_WIDGET_SKILL_INSTALL_COMMAND,
  };
}

export function getCustomWidgetSkillReference(name: CustomWidgetSkillReferenceName) {
  return {
    name,
    file: `references/${name}.md`,
    content: CUSTOM_WIDGET_SKILL_REFERENCES[`references/${name}.md`],
  };
}

export function getCustomWidgetSkillContent() {
  return CUSTOM_WIDGET_SKILL_BUNDLE_MD;
}
