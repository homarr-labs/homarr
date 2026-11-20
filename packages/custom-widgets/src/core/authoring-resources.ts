import { customJsxAuthoringCatalog } from "./component-catalog";
import {
  CUSTOM_WIDGET_COMMON_CHART_GUIDANCE,
  CUSTOM_WIDGET_REQUEST_KIND_GUIDANCE,
  CUSTOM_WIDGET_SKILL_SOURCE_URL,
} from "./ai-prompt";
import type { CustomJsxPropDescriptor } from "./component-catalog-types";
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

const assistantSharedPropNames = new Set(
  [
    "m mx my mt mb ml mr ms me mis mie p px py pt pb pl pr ps pe pis pie",
    "w h miw maw mih mah display flex opacity c bg bga bgp bgr bgsz bd bdrs ff fs fw fz lh lts ta td tt",
    "hiddenFrom visibleFrom lightHidden darkHidden mod style radius shadow withBorder",
    "id title role hidden tabIndex aria-label aria-labelledby aria-describedby",
    "aria-hidden aria-live aria-busy aria-current aria-valuenow aria-valuemin aria-valuemax",
  ].flatMap((names) => names.split(" ")),
);
const cssWideKeywords = new Set(['"-moz-initial"', '"inherit"', '"initial"', '"revert"', '"revert-layer"', '"unset"']);
const maximumInlineTypeLength = 32;

const isAssistantReferenceProp = (name: string) =>
  name !== "attributes" && name !== "unstyled" && !name.endsWith("Props");

const assistantReferenceComponents = customJsxAuthoringCatalog.components.filter(
  ({ name, safety, package: packageName }) =>
    safety !== "denied" && (assistantCommonComponentNames.has(name) || packageName === "@homarr/widgets"),
);
const assistantReferenceSharedProps = customJsxAuthoringCatalog.globalProps.filter(({ name }) =>
  assistantSharedPropNames.has(name),
);
const getAssistantReferenceType = (typeRef: number) => {
  const members = (customJsxAuthoringCatalog.types[typeRef] ?? "unknown")
    .split(" | ")
    .filter((member) => !cssWideKeywords.has(member));
  const booleanMembers = new Set(["false", "true", '"false"', '"true"']);
  if (members.includes("false") && members.includes("true")) {
    return ["boolean", ...members.filter((member) => !booleanMembers.has(member))].join(" | ");
  }
  return members.join(" | ");
};
const assistantReferenceTypes = new Map<number, string>();
const getAssistantReferencePropType = (typeRef: number) => {
  const type = getAssistantReferenceType(typeRef);
  if (type.length <= maximumInlineTypeLength) return type;
  assistantReferenceTypes.set(typeRef, type);
  return typeRef;
};
const toAssistantReferenceProps = (props: readonly CustomJsxPropDescriptor[]) =>
  Object.fromEntries(
    props
      .filter(({ name }) => isAssistantReferenceProp(name))
      .map(({ name, typeRef }) => [name, getAssistantReferencePropType(typeRef)]),
  );
const groupAssistantReferenceProps = (props: readonly CustomJsxPropDescriptor[]) => {
  const namesByType = new Map<string | number, string[]>();
  for (const { name, typeRef } of props) {
    const type = getAssistantReferencePropType(typeRef);
    namesByType.set(type, [...(namesByType.get(type) ?? []), name]);
  }
  return Object.fromEntries([...namesByType].map(([type, names]) => [names.join(" "), type]));
};
const enabledComponentNames = new Set(
  customJsxAuthoringCatalog.components.filter(({ safety }) => safety !== "denied").map(({ name }) => name),
);
const flatComponentAliases = new Set(
  [...enabledComponentNames].filter((name) => name.includes(".")).map((name) => name.replaceAll(".", "")),
);
const assistantSharedProps = groupAssistantReferenceProps(assistantReferenceSharedProps);
const assistantComponents = assistantReferenceComponents.map(
  ({ name, description, props, blockedProps, bind, subcomponents, accessibilityRequirements }) => {
    const required = props.filter((prop) => prop.required).map((prop) => prop.name);
    return {
      name,
      ...(description ? { description } : {}),
      props: toAssistantReferenceProps(props),
      ...(required.length > 0 ? { required } : {}),
      ...(blockedProps.length > 0 ? { blockedProps: blockedProps.map((prop) => prop.name) } : {}),
      ...(bind ? { bind } : {}),
      ...(subcomponents.length > 0 ? { subcomponents } : {}),
      accessibilityRequirements,
    };
  },
);

export const CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE = JSON.stringify({
  mantineVersion: customJsxAuthoringCatalog.mantineVersion,
  iconNames: customJsxTablerIconExamples,
  iconNaming:
    "All installed Tabler kebab-case names are supported; iconNames are examples. Filled icons end in -filled.",
  format:
    "props map each name to its type, or to a numeric ID resolved through types. sharedProps map space-separated names to one type and apply to every component unless blocked; other standard HTML, SVG and aria-* attributes, low-level *Props objects, attributes and unstyled are omitted. Dotted names also accept their flat alias (Tabs.Tab = TabsTab).",
  types: Object.fromEntries(assistantReferenceTypes),
  registeredNames: [...enabledComponentNames].filter((name) => !flatComponentAliases.has(name)),
  sharedProps: assistantSharedProps,
  components: assistantComponents,
});

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export { CUSTOM_WIDGET_SKILL_SOURCE_URL } from "./ai-prompt";
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

Import requires \`$schema\`, \`name\`, keyed \`sources\`/\`requests\`, and one JSX \`template\` string.
Optional: \`description\`, valid URL \`iconUrl\`, keyed \`options\`. Key \`default\` is required in sources, not a source property.

\`\`\`json
{
  "$schema": "${CUSTOM_WIDGET_SCHEMA}",
  "name": "Service summary",
  "sources": { "default": { "baseUrl": "https://your-service.example.com/api", "auth": "bearer" } },
  "requests": { "summary": { "path": "/summary", "trigger": "load" } },
  "template": "<Text>{data.summary?.title}</Text>"
}
\`\`\`

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`; paths append to its URL and exports omit \`integrationId\`.

HTTP sources have optional \`name\`, required \`baseUrl\`, and credential-free \`auth\` forms:
\`"none"\`, \`"bearer"\`, \`"basic"\`, \`{"type":"apiKeyHeader","name":"X-Api-Key"}\`,
\`{"type":"apiKeyQuery","name":"api_key"}\`, or \`{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"}]}\`.
\`{"type":"none"}\` is invalid. Headers auth sends up to 8 encrypted headers: unique names, distinct slots of at most
57 characters; renaming either needs reconfiguration. Use \`bearer\` for Authorization; routing/proxy/cookie/hop-by-hop headers
are reserved. Configure values only in Homarr's secure credential UI, never chat or definitions.

Requests default to source \`default\`, query/GET/load, inherited auth and view permission. Use \`load\` for initial/current
display and \`manual\` for explicit interactions or invocation params. Actions default to modify permission.
${CUSTOM_WIDGET_REQUEST_KIND_GUIDANCE}

JSON responses become their decoded value; \`application/x-ndjson\` becomes an array of decoded lines. Use real public
API URLs and clear self-hosted placeholders; Homarr collects URL and credentials outside the manifest.

Paths start with \`/\`; use \`{option:name}\`/\`{param:name}\` in paths and \`{"$option":"name"}\`/\`{"$param":"name"}\` in query/body.
\`$param\` is manual-only; \`$option\` may drive loads. Path/query values are primitive. Actions use \`kind:"action"\`,
\`trigger:"manual"\`, method/body, permission, confirmation, and \`invalidates\` request IDs; never invent mutation endpoints.

Options: required \`label\`/\`control\`/\`default\`; optional \`description\`/\`choices\`/\`choicesFrom\`/\`min\`/\`max\`/\`step\`/\`advanced\`/\`group\`.
Controls: \`text\`, \`textarea\`, \`number\`, \`switch\`, \`select\`, \`multiSelect\`, \`slider\`, \`date\`, \`time\`, \`color\`, \`icon\`, \`url\`,
\`duration\`, \`timeZone\`, \`json\`. \`choices\`/\`choicesFrom\` need \`select\` or \`multiSelect\`.
`,
  "references/runtime.md": `# Runtime

Load q with body B gives \`data.q === B\`; \`q=events\`/\`B={"events":[...]}\` gives \`data.events.events\`.
Keep sibling states independent, guard optional arrays/nesting, and handle loading/error/empty/success.
Status is \`{ loading, ok, status, statusText, error }\`; \`status.q?.ok === false\` means error.
One RefreshButton per load stays outside its branches; \`requestId\`, never \`request\`. Omit it to refresh all loads.

Options are installation config (\`options.name\`). Temporary controls use literal \`bind\`, defaults and \`inputs.name\`:

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

Manual queries set trigger manual on request and SubFetch. Their body stays local to the child \`(result, meta)\`, never global
data/status. SubFetch owns loading/error/retry; meta has ok/status/statusText/loading=false. When ID, params or definition
changes, the previous result hides until triggered again. RefreshButton inside success reruns captured params.
SubFetch/ActionButton/ToggleSwitch require literal requestId. triggerContent/triggerAriaLabel is already a button: use
non-interactive content. Actions run explicitly, publish local data/status until reload, and retain confirmation/permissions/invalidates.

Params match exactly the request's $param/{param:name}: string/number/boolean, never undefined/null.
Fixed values belong in query/body. Omitted optional values need verified request variants; empty strings need API support.
Validate nonblank optional inputs, show field errors and block invalid requests. Every control changes a request/selection.
Switch/Checkbox use defaultChecked; dependent pagination uses defaultValue={1}/resetKey={inputs.query}.

Safe Date: toISOString/toLocaleString/toLocaleDateString/toLocaleTimeString/getTime/now. Guard timestamps; pass
Date.toLocaleString(value, "en-US", documentedTimezone), otherwise omit timezone argument/label. UTC requires a UTC contract.
Countdown milliseconds: Date.getTime(isoTimestamp) - Date.now(). No constructors, Date.parse or Intl.
Numbers support \`n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })\`, percent/currency/unit/signDisplay.
Guard scalar types and finite numbers, preserve 0/false, and use — for missing values. Convert numbers before relabeling units.
Map cross-collection IDs to verified names or retain IDs. Follow documented rate semantics.

Keep requested fields/collections reachable through summaries, tables/details, filters, pagination or a bounded ScrollArea; never silently slice rows.
Label partial results/totals and verify pagination. Bounded response observations are not full schemas.

${CUSTOM_WIDGET_COMMON_CHART_GUIDANCE}

Use registered names, Icon/TablerIcon with installed kebab-case names, concise expression callbacks and bounded regex.
Callback parameters cannot shadow data/status/options/inputs. Never invent IconFoo components or raw browser callbacks.
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
