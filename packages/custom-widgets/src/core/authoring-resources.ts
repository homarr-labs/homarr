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
export const CUSTOM_WIDGET_SKILL_VERSION = "2.10.6";
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

Key \`default\` is the required source ID, not a source property. Fields: \`name?\`, \`baseUrl\`, \`networkScope\`, \`auth?\`; localhost/loopback URLs require \`networkScope: "loopback"\`; never widen explicit scope:

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

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`. Discover HTTP kinds with \`integration_getKinds\`, choose a full-access \`integration_all\` entry, and bind its ID before preview. Omit URL/auth; paths append to the saved URL, non-GET requests are actions, and exports omit \`integrationId\`.

Auth is \`none\`, \`bearer\`, \`basic\`, \`{ "type": "apiKeyHeader", "name": "X-Api-Key" }\`, or \`{ "type": "apiKeyQuery", "name": "api_key" }\`. Requests default to source \`default\`, query/GET/load, inherited auth, and view permission. Use \`trigger: "load"\` for initial/current display, including option-bound data/status with \`RefreshButton\`; use \`trigger: "manual"\` only for explicit user-triggered queries or invocation params in \`SubFetch\`, \`ActionButton\`, or \`ToggleSwitch\`. Actions are manual/modify; preserve confirmation, permission, and invalidates. DELETE requires full permission and confirmation. No \`load: false\`.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Binding syntax is location-specific: path strings use \`{option:name}\` or \`{param:name}\` with no \`$\` (for example, \`/items/{option:itemId}\`); query/body objects use \`{"$option":"name"}\` or \`{"$param":"name"}\`. \`$param\` is manual-only; \`$option\` may drive loads. Constants stay primitive (\`take: 10\`); names and types are inferred.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.

`,
  "references/runtime.md": `# Runtime

Templates read \`data.requestId\`, \`status.requestId\`, \`options.name\`, and temporary \`inputs.name\`. Status is \`{ loading, ok, status, statusText, error }\`. Render load queries directly from \`data\` and \`status\` with \`RefreshButton\`; never wrap them in \`SubFetch\`.

\`bind\` is temporary; manual request values go in \`params\` and map to \`$param\`:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

Manual queries require \`trigger: "manual"\` on request and \`SubFetch\`; otherwise they run automatically. \`triggerContent\` with \`triggerAriaLabel\` makes custom content the launcher. \`SubFetch\` owns loading/error/retry; its child receives success plus \`{ ok, status, statusText, loading: false }\`. Never author \`onClick\` or fetch callbacks.

\`SubFetch\`, \`ActionButton\`, and \`ToggleSwitch\` need literal \`requestId\`; validation rejects missing/computed IDs.

Inside a successful manual result, \`<RefreshButton requestId="search" label="Run again" />\` reruns the same parameters.

When a manual SubFetch request ID, parameters, or effective definition changes, Homarr immediately hides its prior result and returns to the trigger. It cannot fetch the new parameters until the user triggers it again.

The \`SubFetch\` callback receives the entire JSON response exactly as previewed. If the response is \`{ "results": [...] }\`, render and map \`result.results\`; never map the envelope itself. Trace every rendered field from the preview response before persistence.

Format timestamps with safe static helpers; never use \`new Date\`. Never invent a formatter component. Use \`Date.toLocaleString(value, "en-US", documentedTimezone)\` and label the documented timezone; if no timezone is documented, preserve the source value or omit any timezone label; use UTC only when the response contract says UTC. Also available: \`Date.toISOString\`, \`Date.toLocaleDateString\`, and \`Date.toLocaleTimeString\`.

For compact numeric enums, index a literal label array with a fallback:

\`\`\`jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
\`\`\`

Request-bound controls use literal \`bind\` plus a default (\`defaultChecked\` for Switch/Checkbox); pass \`inputs.<name>\` through manual \`SubFetch params\` to matching \`$param\`. Options are installation config via \`options.name\`, never \`inputs\`; dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove dead controls.

Callback parameters must not shadow the reserved roots \`data\`, \`status\`, \`options\`, or \`inputs\`. Use registered component names returned by discovery; \`Icon\` is an accepted alias for canonical \`TablerIcon\`. Never invent components such as \`<IconFoo />\`.

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

Author one widget with release-matched context; finish validation, evidence, persistence, then return artifact.

- Read primary API documentation once when it is missing or may have changed. Treat supplied samples and successful
  previews as the binding contract; load only needed schema, runtime, security, or component context.
- Search for unknown components once and batch selected details. \`contextAlreadyLoaded\` means reuse the earlier result and continue; \`phaseComplete\` advances to the next visible tool. Stop only for a genuine provider/model or closed-workbench failure.
- Community widgets use \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, and
  \`customWidget_workshopInstall\`; configure and persist.

Return one fenced \`json\` block with the complete definition; keep evidence prose outside it. The definition has keyed
\`sources\`, \`requests\`, \`template\`, and optional \`options\`; actions are requests with \`kind: "action"\`.

- \`sources.default\` is required. HTTP has \`baseUrl\`, \`networkScope\`, and credential-free \`auth\`; localhost/loopback requires
  \`networkScope: "loopback"\`; never widen an explicit scope. Saved sources use \`type: "integration"\`/\`integrationKind\`;
  Homarr holds credentials.
- Saved integrations: discover kinds/full-access entries with \`integration_getKinds\`/\`integration_all\`, bind \`integrationId\`
  before preview, omit URL/auth, and keep non-GET requests as actions.
- Paths are slash-prefixed: strings use \`{option:name}\`/\`{param:name}\`; query/body uses \`{"$option":"name"}\`/\`{"$param":"name"}\`.
  Loads use \`trigger: "load"\`; manual helpers use \`trigger: "manual"\`.
- Actions stay manual; preserve \`confirmation\`, \`permission\`, and \`invalidates\`; DELETE requires full permission/confirmation.
  \`$param\` is manual-only; \`$option\` may drive loads.
- Read \`data.requestId\`; check \`status.requestId?.loading\`/\`?.ok === false\`; show loading/error/empty/success with
  \`RefreshButton\`. \`SubFetch\` owns manual loading/error/retry, receives \`(result, metadata)\`; map the response array, not envelope.
- Options have \`label\`, \`control\`, \`default\`; installation config is \`options.name\`, never \`inputs\`. Request-bound TextInput,
  Select, NumberInput, Pagination use literal \`bind\` + default and manual \`SubFetch params\` map \`inputs.<name>\` to \`$param\`.
  Dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove controls with no option, request, or helper; guard arrays/nested with \`??\`;
  preserve documented timezone values; use UTC only when the contract says UTC.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; \`Icon\` may alias \`TablerIcon\`. Keep hierarchy,
  theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from the request, verified context, and sample. Preserve a migration's supported API
   path, method, body, options, and visible behavior; omit unknown requests rather than guessing.
2. Use \`customWidget_validateTemplate\` for focused JSX diagnostics. Send source/request/option changes once to
   \`customWidget_previewCreate\`; use \`customWidget_previewReviseTemplate\` for a JSX-only correction in its session. In the
   Assistant wrapper, multiline JSX uses \`templateLines\` and preview creation receives the complete definition.
3. Test every returned query or simulated action once. On a concrete schema or preview error, fix only that field, call \`customWidget_validateTemplate\` once to re-enter validation, then visible \`customWidget_previewCreate\` with the corrected definition; use \`customWidget_previewReviseTemplate\` only for JSX-only errors. Stop only for genuine provider/model, lifecycle-service, or workbench-closure failures.
4. After a successful final preview and exact tests, call \`customWidget_createFromPreview\`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

Report actual lifecycle results. If unavailable, add one post-artifact \`Unverified:\` line naming missing validation, preview,
renderer, or persistence. Never claim rendering/persistence from schema checks.

`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use release-matched tools and primary docs. For each widget, validate JSX, create one preview, test every returned query/action,
then persist that exact preview. JSX-only fixes use \`customWidget_previewReviseTemplate\` with its session; it resets evidence.
In the Assistant wrapper, multiline JSX goes to \`templateLines\`; \`previewCreate\` receives the complete definition.

Deliver the smallest result while preserving migration intent, request shape, and visible behavior. On a concrete schema/preview
error, fix only that field, call \`customWidget_validateTemplate\` once, then visible \`customWidget_previewCreate\` with the
corrected definition. Changes to sources/requests/options require fresh \`customWidget_previewCreate\`; JSX-only fixes use
\`customWidget_previewReviseTemplate\`. \`contextAlreadyLoaded\` reuses earlier context and continues; \`phaseComplete\` advances.
Only genuine provider/model, unavailable lifecycle service, or closed-workbench errors are terminal. If lifecycle tools are
unavailable, return one importable definition and one unverified note.

Binding: path strings use \`{option:name}\`/\`{param:name}\`; query/body objects use \`{"$option":"name"}\`/\`{"$param":"name"}\`;
$param is manual-only and $option may drive loads. Request-bound TextInput, Select, NumberInput, and Pagination use literal
\`bind\`, a default, and manual \`SubFetch params\` for matching \`$param\`; options are installation config via \`options.name\`.
Dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Fallbacks preserve source shape: HTTP keeps \`baseUrl\`,
\`networkScope\`, \`auth\`; integrations use \`type: "integration"\`, \`integrationKind\`, optional \`integrationId\`; loopback URLs
require \`networkScope: "loopback"\`.

Load \`schema\` once for a new manifest, \`runtime\` for manual interactions, and \`security\` for auth/mutations. Search once,
prefer discovered components, keep credentials outside definitions, and make all states useful.`;

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
