import { customJsxAuthoringCatalog } from "./component-catalog";
import { commonSafeProps } from "./component-props";
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
const assistantSharedPropNames = new Set<string>(commonSafeProps);
const assistantSharedProps = customJsxAuthoringCatalog.globalProps.filter(({ name }) =>
  assistantSharedPropNames.has(name),
);
const assistantReferenceTypeIds = new Set(
  [...assistantSharedProps, ...assistantReferenceComponents.flatMap(({ props }) => props)].map(
    ({ typeRef }) => typeRef,
  ),
);

export const CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE = JSON.stringify({
  mantineVersion: customJsxAuthoringCatalog.mantineVersion,
  iconNames: customJsxTablerIconExamples,
  iconNaming:
    "All installed Tabler kebab-case names are supported; iconNames are examples. Filled icons end in -filled.",
  format:
    "Props are [name, type ID, required]. Common shared props apply unless blocked. Type IDs resolve through types. Fetch other shared props with customWidget_getSharedProps; supported names remain available in the component catalog.",
  types: Object.fromEntries([...assistantReferenceTypeIds].map((id) => [id, customJsxAuthoringCatalog.types[id]])),
  registeredNames: customJsxAuthoringCatalog.components
    .filter(({ safety }) => safety !== "denied")
    .map(({ name }) => name),
  sharedProps: assistantSharedProps.map(({ name, typeRef, required }) => [name, typeRef, required]),
  components: assistantReferenceComponents.map(
    ({ name, description, props, blockedProps, bind, subcomponents, accessibilityRequirements }) => ({
      name,
      description,
      props: props.map(({ name: propName, typeRef, required }) => [propName, typeRef, required]),
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
export const CUSTOM_WIDGET_SKILL_VERSION = "2.10.8";
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

\`sources.default\` is required. HTTP sources have \`baseUrl\`, \`networkScope\`, optional \`name\`, and optional \`auth\` (default
\`"none"\`). Scope \`public\` permits public addresses, \`private\` additionally permits private addresses, and \`loopback\` additionally
permits loopback. Blocked address classes remain blocked at every scope. Localhost requires \`loopback\`; preserve explicit
scope rather than widening it on failure. Base URLs have no credentials, query, or fragment. Use documented public URLs or
\`https://your-service.example.com\` for missing self-hosted URLs; Homarr configures URL/scope/credentials separately.

\`\`\`json
{
  "sources": {
    "default": {
      "baseUrl": "https://your-service.example.com/api/v1",
      "networkScope": "private",
      "auth": { "type": "apiKeyHeader", "name": "X-Api-Key" }
    }
  },
  "requests": {
    "summary": { "path": "/summary" },
    "search": {
      "trigger": "manual",
      "path": "/search",
      "query": { "q": { "$param": "query" }, "page": { "$param": "page" } }
    },
    "create": {
      "kind": "action",
      "method": "POST",
      "path": "/items",
      "body": { "id": { "$param": "id" } },
      "confirmation": "Create this item?",
      "invalidates": ["summary"]
    }
  }
}
\`\`\`

Auth: \`"none"\`, \`"bearer"\`, \`"basic"\`, \`{"type":"apiKeyHeader","name":"X-Api-Key"}\`, or
\`{"type":"apiKeyQuery","name":"api_key"}\`. Values are credential-free declarations.

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`. Discover supported kinds
and matching full-access entries with integration tools. Bind the ID before preview; omit URL/scope/auth. Paths append to the
saved URL; non-GET requests are actions. Portable exports omit integrationId.

Requests default to source \`default\`, query/GET/load, inherited auth, and view permission. Initial/current displays use load;
explicit interactions use manual. Actions stay manual with modify permission; DELETE requires full permission and
confirmation. Preserve confirmation, permission, and invalidates. Query responses are decoded JSON; application/x-ndjson is
an array of decoded lines.

Paths start with \`/\` and use \`{option:name}\`/\`{param:name}\`. Query/body bindings use \`{"$option":"name"}\`/\`{"$param":"name"}\`.
\`$param\` is manual-only; \`$option\` may drive loads. Path/query values are primitive; JSON bodies may contain structured options.

Every option has label, control, default. Optional fields: description, choices, choicesFrom, min, max, step, advanced, group.
Static select choices are label/value objects; choicesFrom uses request, optional itemsPath, valuePath, and labelPath. Use a
load request and preserve its response envelope. Structured options use control \`json\`.
`,
  "references/runtime.md": `# Runtime

Load queries read \`data.requestId\` (the untouched decoded response body) and \`status.requestId\` (\`loading\`, \`ok\`, \`status\`,
\`statusText\`, \`error\`). For request \`events\` returning \`{"events":[...]}\`, use \`data.events.events\`. Guard optional arrays and
nested fields; \`status.events?.ok === false\` is an error. Keep sibling request states independent. Use one RefreshButton per
load request outside its state branches.

Manual queries set \`trigger: "manual"\` on both request and SubFetch. Results stay local to that SubFetch; its child receives
\`(result, metadata)\` with the same response envelope. SubFetch owns loading/error/retry, and metadata has
\`{ ok, status, statusText, loading: false }\`.

\`\`\`jsx
<Stack>
  <TextInput bind="search" label="Search" defaultValue="" />
  <NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
  <SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
    {(result) => (
      <Stack>
        {(result.results ?? []).map((item) => (
          <Text key={item.id}>{item.name}</Text>
        ))}
      </Stack>
    )}
  </SubFetch>
</Stack>
\`\`\`

SubFetch/ActionButton params match exactly the \`$param\`/\`{param:name}\` references in that request. Fixed values belong in
request query/body. When a manual request ID, params, or definition changes, the prior result hides until triggered again.
Inside a successful manual result, RefreshButton with the same requestId reruns its captured parameters.

SubFetch, ActionButton, and ToggleSwitch need literal requestId. \`triggerContent\` plus \`triggerAriaLabel\` supplies a SubFetch
launcher already wrapped in a button; use non-interactive Text/Card content. Actions never run automatically. After an
explicit ActionButton/ToggleSwitch invocation, its response appears in that widget's \`data.requestId\`/\`status.requestId\` until
reload. Guard the initial state. Preserve request confirmation, permission, and invalidations.

Installation options use \`options.name\`. Temporary controls use literal \`bind\` and \`defaultValue\` (\`defaultChecked\` for
Switch/Checkbox); send \`inputs.name\` through manual params. Dependent pagination uses \`defaultValue={1}\` and
\`resetKey={inputs.search}\`. Controls must affect a request or visible selection.

Safe Date helpers: \`Date.toISOString\`, \`Date.toLocaleString\`, \`Date.toLocaleDateString\`, \`Date.toLocaleTimeString\`,
\`Date.getTime\`, and \`Date.now\`. Guard missing timestamps. Use \`Date.toLocaleString(value, "en-US", documentedTimezone)\` when a
timezone is specified; otherwise omit the timezone argument/label or preserve the source value. Label UTC only when the
contract says UTC. Countdowns use \`Date.getTime(isoTimestamp) - Date.now()\` in milliseconds. Constructors and Date.parse are
unavailable.

Use registered component names; Icon aliases TablerIcon and accepts installed kebab-case names. Concise expression callbacks
support collections and trusted slots; their parameters cannot shadow \`data\`, \`status\`, \`options\`, or \`inputs\`. Regex is
limited to safe string operations. Numeric enums can use a literal label array with a fallback.
`,
  "references/security.md": `# Security

All requests use Homarr's protected server executor. Source origin, network scope, DNS, redirects, SSRF, rate limits, permissions, size limits, timeouts, and encrypted credential injection remain enforced.

The JSX interpreter blocks imports, hooks, refs, raw event callbacks, browser requests, eval, arbitrary functions, prototype access, unsafe URLs, global CSS escape, arbitrary portals, bigint, statement blocks, IIFEs, and recursion. Regex literals must be bounded and reject backreferences, lookbehind, nested quantifiers, excessive length, and unsupported flags.

Credentials are stored separately and never exported or returned to an agent. A published self-hosted source URL is only a suggestion: installers must confirm or replace private and loopback URLs for their own Homarr deployment. Source origins cannot be controlled through widget options.
`,
} as const;

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author, repair, preview, install, or configure Homarr Custom JSX v2 widgets through tools or an importable definition.
---

# Homarr Custom Widget

Build the requested widget from verified API contracts and samples. Preserve working behavior during repairs and migrations.
Use shipped examples for matching services; research only missing or changed contracts. Keep credentials in Homarr.

## Context

Reuse context already supplied by the host. Load only the missing reference:

- [schema](references/schema.md): new manifests, sources, requests, option bindings, or migration contracts.
- [runtime](references/runtime.md): response paths, manual interactions, input bindings, and safe formatting helpers.
- [security](references/security.md): authentication, network access, and mutations.

Use registered components. Batch unknown names with \`customWidget_getComponents\`; search with \`customWidget_findComponents\`
when the component name is unknown. Fetch a full component document only for an unresolved prop or concrete diagnostic.
\`contextAlreadyLoaded\` reuses earlier context; \`phaseComplete\` advances to the visible next phase.

## Author

- Include \`$schema: "homarr-custom-widget-v2"\`, \`name\`, keyed \`sources\`/\`requests\`, and one JSX \`template\`; \`options\` is optional.
  \`sources.default\` is required even for static widgets. HTTP sources use \`baseUrl\`, \`networkScope\`, and credential-free \`auth\`.
  Saved integration sources use \`type: "integration"\`/\`integrationKind\`; bind a matching full-access \`integrationId\` before preview.
- Load requests render \`data.requestId\`/\`status.requestId\`, with a RefreshButton and useful loading/error/empty/success states.
  Preserve response envelopes and guard nullable fields. Manual SubFetch renders its result inside its child callback.
- Options are installation config via \`options.name\`; temporary controls use literal \`bind\` plus a default and pass
  \`inputs.name\` through manual request \`params\`. Every control must affect a request or visible selection.
- Use one JSX expression, registered names, concise expression callbacks, theme tokens, and wrapping tile layouts.
  Imports, hooks, raw HTML/events, browser requests, arbitrary functions, statements, IIFEs, and recursion are unavailable.

## Preview and save

When lifecycle tools are available and creation/editing is requested:

1. Send the complete candidate directly to \`customWidget_previewCreate\`; it validates manifest and JSX together. Pass
   \`definitionId\` for an edit. Multiline JSX in the Assistant wrapper uses \`templateLines\`.
2. Follow source configuration requests in Homarr, then test every returned query and simulated action once; batch independent
   reads. Match response paths and parameter names to the JSX. Simulate mutations unless live execution is explicitly requested.
3. Correct concrete diagnostics while preserving accepted behavior. Manifest changes require fresh \`previewCreate\`; JSX-only
   corrections use \`customWidget_previewReviseTemplate\`, which resets evidence. Retest the corrected candidate.
4. Save the exact tested preview with \`customWidget_updateFromPreview\` for edits or \`customWidget_createFromPreview\` for new
   widgets. Follow its \`nextAction\` once. Report the actual saved result briefly.

For isolated JSX diagnostics, use \`customWidget_validateTemplate\`; it is not a preview prerequisite. If a tool is unavailable
or repeated attempts make no progress, stop that path and report the missing step. Never claim renderer or persistence proof
from schema validation. Community installs use Workshop search/get/install, then source configuration.

When tools are unavailable or the user requests an artifact, return one complete fenced \`json\` definition. Add one
\`Unverified:\` line for missing preview, renderer, or persistence evidence. A successful tool save needs no duplicate manifest.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use verified contracts and samples; reuse loaded context. Load schema for a new manifest, runtime for manual interactions or
response paths, and security for auth/mutations. Resolve only unknown components through focused search and batched details.

Send the complete definition directly to customWidget_previewCreate; it validates manifest and JSX. Use definitionId for an
edit and templateLines for multiline Assistant tool input. Configure sources in Homarr, test every returned query and
simulated action, then save the exact tested preview with updateFromPreview for edits or createFromPreview for new widgets.
Manifest changes need a fresh preview; JSX-only fixes use previewReviseTemplate and reset evidence. validateTemplate is only
for focused diagnostics. Batch reads; reuse contextAlreadyLoaded and advance on phaseComplete. Stop a failing path when
repeated attempts make no progress.

Include sources.default, keyed requests, optional options, and one JSX template. Preserve source scope, request shape,
response envelopes, and migration behavior. Keep credentials outside definitions. Every control affects a request or visible
selection; render useful states in narrow tiles.

After a tool save, report its actual result briefly. When tools are unavailable or an artifact is requested, return one
complete fenced JSON definition and one Unverified: line naming missing evidence.
`;

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
