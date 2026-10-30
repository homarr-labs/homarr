import { customJsxAuthoringCatalog } from "./component-catalog";
import { CUSTOM_WIDGET_SCHEMA } from "./custom-jsx-schema";
import { customJsxTablerIconExamples } from "./tabler-icons";

export {
  findCustomWidgetComponents,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetExample,
  getCustomWidgetExampleCatalog,
  getCustomWidgetSharedProps,
} from "./authoring-catalog";

const assistantCommonComponentNames = new Set([
  "Stack",
  "Group",
  "Box",
  "SimpleGrid",
  "Card",
  "Paper",
  "Text",
  "Title",
  "Badge",
  "Alert",
  "Progress",
  "ThemeIcon",
  "Divider",
  "Anchor",
  "Image",
  "ScrollArea",
  "Skeleton",
  "Center",
  "TextInput",
  "NumberInput",
  "Select",
  "Pagination",
  "Switch",
  "Checkbox",
  "Table",
  "Tabs",
]);

const assistantReferenceComponents = customJsxAuthoringCatalog.components.filter(
  ({ name, safety, package: packageName }) =>
    safety !== "denied" && (assistantCommonComponentNames.has(name) || packageName === "@homarr/widgets"),
);
const assistantReferenceTypeIds = new Set(
  [...customJsxAuthoringCatalog.globalProps, ...assistantReferenceComponents.flatMap(({ props }) => props)].map(
    ({ typeRef }) => typeRef,
  ),
);

export const CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE = JSON.stringify({
  mantineVersion: customJsxAuthoringCatalog.mantineVersion,
  iconNames: customJsxTablerIconExamples,
  iconNaming:
    "All installed Tabler kebab-case names are supported; iconNames are examples. Filled icons end in -filled.",
  format: "Props are [name, type ID, required]. Shared props apply unless blocked. Type IDs resolve through types.",
  types: Object.fromEntries([...assistantReferenceTypeIds].map((id) => [id, customJsxAuthoringCatalog.types[id]])),
  registeredNames: customJsxAuthoringCatalog.components
    .filter(({ safety }) => safety !== "denied")
    .map(({ name }) => name),
  sharedProps: customJsxAuthoringCatalog.globalProps.map(({ name, typeRef, required }) => [name, typeRef, required]),
  components: assistantReferenceComponents.map(
    ({ name, description, props, blockedProps, bind, subcomponents, accessibilityRequirements }) => ({
      name,
      description,
      props: props.map(({ name, typeRef, required }) => [name, typeRef, required]),
      blockedProps,
      bind,
      subcomponents,
      accessibilityRequirements,
    }),
  ),
});

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_VERSION = "2.10.9";
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
  $schema: "${CUSTOM_WIDGET_SCHEMA}";
  name: string;
  description?: string;
  iconUrl?: string;
  sources: Record<string, CustomWidgetSource>;
  requests: Record<string, CustomWidgetRequest>;
  options?: Record<string, CustomWidgetOption>;
  template: string;
}
\`\`\`

Key \`default\` is the required source ID, not a source property. Fields: \`name?\`, \`baseUrl\`, \`auth?\`:

\`\`\`json
{
  "sources": {
    "default": {
      "name": "Service",
      "baseUrl": "http://service.local:5055/api/v1",
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

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`. Discover and bind a full-access entry before preview. Omit URL/auth; paths append to its URL, non-GET requests are actions, and exports omit \`integrationId\`.

Auth is \`none\`, \`bearer\`, \`basic\`, \`apiKeyHeader\`, \`apiKeyQuery\`, or \`headers\`. Requests default to source \`default\`, query/GET/load, inherited auth, and view permission. Use \`load\` for initial/current display and \`manual\` only for explicit interactions or invocation params. Actions are manual/modify; DELETE requires full permission and confirmation.

For multiple secret headers, use \`auth: {"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"},{"name":"X-Api-Secret","slot":"secret"}]}\`. Up to 8 HTTP-token names are allowed, unique ignoring case, with distinct stable slot IDs of at most 57 characters. Homarr configures each slot separately and stores its value encrypted; the manifest contains only names and slots. Header name or slot changes require credential configuration again. Use \`bearer\` for Authorization; routing, proxy, forwarding, cookie and hop-by-hop headers remain reserved.

JSON responses become their decoded value. Responses with \`application/x-ndjson\` become an array with one decoded object per non-empty line.

Use real public API URLs and clear self-hosted placeholders. Homarr collects URL and credentials outside the manifest.

Paths use \`{option:name}\`/\`{param:name}\`; query/body objects use \`{"$option":"name"}\`/\`{"$param":"name"}\`. \`$param\` is manual-only; \`$option\` may drive loads. Constants stay primitive.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.
`,
  "references/runtime.md": `# Runtime

Load queries render \`data.requestId\`/\`status.requestId\` with \`RefreshButton\`, not \`SubFetch\`. Status: \`{ loading, ok, status, statusText, error }\`. Manual \`SubFetch\` results are instance-local, never \`data\`/\`status\`; render them in its child.

\`bind\` is temporary; manual request values go in \`params\` and map to \`$param\`:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

Manual queries need \`trigger: "manual"\` on request and \`SubFetch\`; otherwise they run automatically. \`triggerContent\`/\`triggerAriaLabel\` customize its button wrapper: use non-interactive Text/Card, never Button, Anchor or form controls. \`SubFetch\` owns loading/error/retry; its child receives (result, \`{ ok, status, statusText, loading: false }\`) on success. No authored \`onClick\`/fetch callbacks.

\`SubFetch\`, \`ActionButton\`, \`ToggleSwitch\` require literal \`requestId\`; missing/computed IDs fail validation.

Explicit \`ActionButton\`/\`ToggleSwitch\` invocations publish responses to that widget's \`data.requestId\`/\`status.requestId\`. Guard the pre-action state. Responses do not survive reloads; actions never run automatically.

Inside a successful manual result, \`<RefreshButton requestId="search" label="Run again" />\` reruns the same parameters.

SubFetch/ActionButton params must exactly match that request's $param/{param:name} names. Fixed query values (limit/fields) belong in requests.<id>.query, not params. Test the JSX's parameter names; repair mismatches in both. Changing a manual SubFetch ID, params or definition hides old results and restores the trigger; fetch again only on invocation.

Exact paths: load ID \`q\`, raw body \`B\` -> \`data.q === B\`; ID \`events\`, body \`{"events":[...]}\` -> \`data.events.events\`. Manual \`SubFetch\` receives \`B\` -> \`result.events\`. Preserve repeated keys; check core paths against previews, revise/retest before saving.

Use static \`Date.toLocaleString(value, "en-US", documentedTimezone)\`, labeling only documented timezones; otherwise preserve the source value or omit the timezone label. UTC requires a UTC response contract. Countdowns: \`Date.getTime(isoTimestamp) - Date.now()\` is milliseconds. Also supported: \`Date.toISOString\`, \`Date.toLocaleDateString\`, \`Date.toLocaleTimeString\`. No \`new Date\`, \`Date.parse\` or invented formatter components.

Numeric enum labels need a fallback:

\`\`\`jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
\`\`\`

Request controls use literal \`bind\` + default (\`defaultChecked\` for Switch/Checkbox); map temporary \`inputs.<name>\` through manual \`SubFetch params\` to matching \`$param\`. Installation config is \`options.name\`, not \`inputs\`. Dependent pagination: \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove dead controls.

Callback parameters cannot shadow \`data\`, \`status\`, \`options\`, \`inputs\`. Discover registered names; \`Icon\` aliases \`TablerIcon\`, not invented \`<IconFoo />\` components.

Use expression callbacks for supported collections/trusted slots; no blocks, IIFEs, recursion or raw events. Regex: safe string operations only.

`,
  "references/security.md": `# Security

All requests use Homarr's protected server executor. Source origin, credential destinations, rate limits, permissions, size limits, timeouts, and encrypted credential injection remain enforced. HTTP sources can reach any address accessible to the Homarr server.

The JSX interpreter blocks imports, hooks, refs, raw event callbacks, browser requests, eval, arbitrary functions, prototype access, unsafe URLs, global CSS escape, arbitrary portals, bigint, statement blocks, IIFEs, and recursion. Regex literals must be bounded and reject backreferences, lookbehind, nested quantifiers, excessive length, and unsupported flags.

Credentials are stored separately and never exported or returned to an agent. A published self-hosted source URL is only a suggestion: installers must confirm or replace private and loopback URLs for their own Homarr deployment. Source origins cannot be controlled through widget options.
`,
} as const;

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author requested widgets with release context; validate, test, persist, return artifacts.

- Read missing/changed API contracts in primary docs. Samples/successful previews are binding. Load needed schema/runtime/security references
  or component context only.
- Batch unknown component searches/details. \`contextAlreadyLoaded\` reuses context; \`phaseComplete\` advances.
  Only genuine provider/model, lifecycle-service or workbench-closure failures are terminal.
- Community: \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, \`customWidget_workshopInstall\`; configure/persist.

Return one complete fenced \`json\` definition, evidence outside. Use keyed \`sources\`, \`requests\`, \`template\`, optional \`options\`;
actions are requests with \`kind: "action"\`.

- Require \`sources.default\`. HTTP uses \`baseUrl\`/credential-free \`auth\`; Homarr holds secrets.
- Saved integrations: discover kinds/full-access entries via \`integration_getKinds\`/\`integration_all\`; bind \`integrationId\`
  before preview, use \`type: "integration"\`/\`integrationKind\`, omit URL/auth; non-GET requests are actions.
- Slash-prefixed paths use \`{option:name}\`/\`{param:name}\`; query/body: \`{"$option":"name"}\`/\`{"$param":"name"}\`.
  Loads: \`trigger: "load"\`; manual helpers: \`trigger: "manual"\`.
- Keep actions manual with \`confirmation\`, \`permission\`, \`invalidates\`; DELETE requires full permission/confirmation.
  \`$param\` is manual-only; \`$option\` may drive loads.
- Loads: data.requestId/status.requestId + RefreshButton; status.requestId?.ok === false signals error. Manual SubFetch
  keeps results local; render fields in its (result, metadata) child.
- Options need \`label\`/\`control\`/\`default\`; installation config is \`options.name\`, not \`inputs\`. TextInput/Select/NumberInput/Pagination
  request controls use literal \`bind\` + default; manual \`SubFetch params\` map \`inputs.<name>\` to \`$param\`.
  Dependent pagination: \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove controls without an option/request/helper.
  Guard arrays/nesting with \`??\`; preserve documented timezones; UTC only for UTC contracts.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks or arbitrary functions. Discover registered names; \`Icon\` aliases \`TablerIcon\`. Keep purposeful hierarchy,
  theme tokens, useful states and narrow/wide layouts.

## Bounded lifecycle

1. Build a credential-free definition from the request, verified context/sample. Preserve migration path/method/body/options/behavior;
   omit unknown requests instead of guessing.
2. Send the complete definition directly to \`customWidget_previewCreate\` (manifest + JSX validation).
   \`customWidget_validateTemplate\` is only for isolated JSX diagnostics, never a preview prerequisite.
   \`customWidget_previewReviseTemplate\` repairs JSX only after preview creation. Assistant multiline JSX uses \`templateLines\`;
   preview creation still receives the complete definition.
3. Test every returned query/simulated action once; batch independent queries. For concrete schema/preview errors, fix that field
   and retry \`customWidget_previewCreate\`; JSX-only preview repairs use \`customWidget_previewReviseTemplate\`.
4. Persist with \`customWidget_updateFromPreview\` if preview used \`definitionId\`, otherwise \`customWidget_createFromPreview\`.
   Follow create \`nextAction\` once. Configure secrets in Homarr; never repeat plaintext secrets.
   Edits: inspect \`removedFromSaved\`, restore unrelated losses; \`acknowledgedRemovals\` covers only exact user-requested removals.
   The guard is heuristic, not authorization or proof of semantic preservation.

## Delivery

Report actual lifecycle results; if unavailable, add one post-artifact \`Unverified:\` line naming missing validation/preview/renderer/persistence.
Schema checks prove neither rendering nor persistence.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Current tools/primary docs: validate one preview, batch/test every query/action, persist.
Assistant multiline JSX: \`templateLines\`; \`previewCreate\` takes the complete definition.

Minimize while preserving migration intent/request shape/visible behavior. Fix only concrete schema/preview fields; retry
\`customWidget_previewCreate\`. Source/request/option changes need fresh previews; JSX-only repairs:
\`customWidget_previewReviseTemplate\` with its session, resetting evidence. \`customWidget_validateTemplate\`: JSX diagnostics only,
never a preview prerequisite. \`contextAlreadyLoaded\` reuses context; \`phaseComplete\` advances. Only genuine provider/model,
unavailable lifecycle service or closed-workbench failures are terminal. Without lifecycle tools: one importable definition
and one unverified note.

Paths: \`{option:name}\`/\`{param:name}\`; query/body: \`{"$option":"name"}\`/\`{"$param":"name"}\`.
$param is manual-only; $option may drive loads. TextInput/Select/NumberInput/Pagination use literal \`bind\` + default,
manual \`SubFetch params\` for matching \`$param\`; installation config uses \`options.name\`.
Dependent pagination: \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Preserve fallback source shape: HTTP \`baseUrl\`/\`auth\`;
integrations \`type: "integration"\`/\`integrationKind\`/optional \`integrationId\`.

Load \`schema\` once for new manifests, \`runtime\` for interactions, \`security\` for auth/mutations: \`customWidget_getReference\`
(\`name\`) or \`homarr://custom-widgets/references/<name>\`. Live schema: \`customWidget_schema\` or
\`homarr://custom-widgets/schema\` only when needed. Search once; use discovered components, external credentials, useful states.

Edits: restore unrelated \`removedFromSaved\` losses; \`customWidget_updateFromPreview\` takes \`acknowledgedRemovals\` only for exact
user-requested keys. Guard: heuristic, not authorization/proof of semantic preservation. Create saves unplaced; use a placement
tool or Homarr board editor; report saved unplaced until placed.`;

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
