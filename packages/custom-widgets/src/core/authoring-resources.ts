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

\`sources.default\` is required. HTTP sources have \`baseUrl\`, optional \`name\`, and optional \`auth\` (default \`"none"\`). Base URLs
have no credentials, query, or fragment. Use documented public URLs or \`https://your-service.example.com\` for missing
self-hosted URLs; Homarr configures URLs and credentials separately.

\`\`\`json
{
  "sources": {
    "default": {
      "baseUrl": "https://your-service.example.com/api/v1",
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

Multiple encrypted headers use \`{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"},{"name":"X-Api-Secret","slot":"secret"}]}\`.
Use at most 8 HTTP-token names, unique ignoring case, with distinct stable slot IDs of at most 57 characters. Configure
values separately in Homarr. Header name or slot changes require credential configuration again. Use \`bearer\` for
Authorization; routing, proxy, forwarding, cookie and hop-by-hop headers remain reserved.

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`. Discover supported kinds
and matching full-access entries with integration tools. Bind the ID before preview; omit URL/auth. Paths append to the
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

All requests use Homarr's protected server executor. Source origin, credential destinations, rate limits, permissions, size limits, timeouts, and encrypted credential injection remain enforced. HTTP sources can reach any address accessible to the Homarr server.

The JSX interpreter blocks imports, hooks, refs, raw event callbacks, browser requests, eval, arbitrary functions, prototype access, unsafe URLs, global CSS escape, arbitrary portals, bigint, statement blocks, IIFEs, and recursion. Regex literals must be bounded and reject backreferences, lookbehind, nested quantifiers, excessive length, and unsupported flags.

Credentials are stored separately and never exported or returned to an agent. A published self-hosted source URL is only a suggestion: installers must confirm or replace private and loopback URLs for their own Homarr deployment. Source origins cannot be controlled through widget options.
`,
} as const;

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author, repair, preview, install, or configure Homarr Custom JSX v2 widgets through tools or an importable definition.
---

# Homarr Custom Widget

Build from verified contracts/samples and matching shipped examples; research only missing/changed contracts.
Preserve working repairs/migrations; keep credentials in Homarr.

## Context

Reuse supplied context; load only missing references:

- [schema](references/schema.md): new manifests, sources, requests, options, migration contracts.
- [runtime](references/runtime.md): response paths, manual interactions, input bindings, safe formatters.
- [security](references/security.md): auth, network access, mutations.

Use registered components. Resolve unknown names with \`customWidget_findComponents\`; batch details with
\`customWidget_getComponents\`. Full documents are only for unresolved props/diagnostics.
Reuse \`contextAlreadyLoaded\`; \`phaseComplete\` advances to the visible next phase.

## Working-app design

Use faithful numbers, rows, or charts; no quotas. Keep identities, units and missingness honest; unknown is not zero.
Ground series/history/denominators in verified data. Discover needed registered charts/helpers; verify safe props/data
grammar, not assumed callbacks/overlays. Quiet theme tokens; persistent config in options. Use supported accessible
motion/disclosure, reduced motion and keyboard/touch access. Keep facts visible; verify hover and narrow/wide host fit or
report missing evidence. Preserve repairs/migrations.

https://impeccable.style/ and https://usehallmark.com/ are app references, not marketing pages, packages, catalogs,
required tools, or API authority.

## Author

- Definition: \`$schema: "homarr-custom-widget-v2"\`, \`name\`, keyed \`sources\`/\`requests\`, one JSX \`template\`, optional \`options\`.
  \`sources.default\` is always required, even static. HTTP: \`baseUrl\`, credential-free \`auth\`. Integrations:
  \`type: "integration"\`/\`integrationKind\`; bind a matching full-access \`integrationId\` before preview.
- Loads: \`data.requestId\`/\`status.requestId\`, RefreshButton, useful loading/error/empty/success states. Preserve envelopes;
  guard nullable fields. Manual SubFetch renders its result in its child callback.
- Config: \`options.name\`. Temporary controls: literal \`bind\`, default, \`inputs.name\` passed through manual request \`params\`.
  Every control affects a request or visible selection.
- JSX: one expression, registered names, concise callbacks, theme tokens, wrapping tiles. Imports, hooks, raw HTML/events,
  browser requests, arbitrary functions, statements, IIFEs, and recursion are unavailable.

## Preview and save

With requested creation/editing and available lifecycle tools:

1. Call \`customWidget_previewCreate\` with the complete candidate (validates manifest/JSX). Edits: \`definitionId\`;
   multiline Assistant JSX: \`templateLines\`.
2. Configure sources in Homarr. Test every returned query/simulated action once; batch independent reads. Match response
   paths/params to JSX. Live mutations require an explicit request.
3. Fix concrete diagnostics; preserve accepted behavior. Manifest changes: fresh \`previewCreate\`; JSX-only:
   \`customWidget_previewReviseTemplate\` resets evidence. Retest.
4. Save the exact tested preview: \`customWidget_updateFromPreview\` (edit) or \`customWidget_createFromPreview\` (new).
   Follow \`nextAction\` once; briefly report the actual saved result.

\`customWidget_validateTemplate\`: isolated JSX diagnostics only, never a preview prerequisite. Stop unavailable or repeatedly
stalled paths. Workshop: search/get/install, then configure sources. Schema checks prove neither rendering nor persistence.

Without tools or on an artifact request: one complete fenced \`json\` definition plus one \`Unverified:\` line naming missing
preview/renderer/persistence evidence. Successful saves need no duplicate manifest.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Choose faithful numbers, rows, or charts without quotas; discover task-needed registered props. Keep units/missingness honest.
Use verified contracts and samples; reuse loaded context. Load schema for a new manifest, runtime for manual interactions or
response paths, and security for auth/mutations. Resolve only unknown components through focused search and batched details.

Send the complete definition directly to customWidget_previewCreate; it validates manifest and JSX. Use definitionId for an
edit and templateLines for multiline Assistant tool input. Configure sources in Homarr, test every returned query and
simulated action, then save the exact tested preview with updateFromPreview for edits or createFromPreview for new widgets.
Manifest changes need a fresh preview; JSX-only fixes use previewReviseTemplate and reset evidence. validateTemplate is only
for focused diagnostics. Batch reads; reuse contextAlreadyLoaded and advance on phaseComplete. Stop a failing path when
repeated attempts make no progress.

Include sources.default, keyed requests, optional options, and one JSX template. Preserve source shape, request shape,
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
