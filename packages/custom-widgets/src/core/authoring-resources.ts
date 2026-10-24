import { customJsxAuthoringCatalog } from "./component-catalog";
import { CUSTOM_WIDGET_COMMON_CHART_GUIDANCE, CUSTOM_WIDGET_SKILL_SOURCE_URL } from "./ai-prompt";
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

Requests default to source \`default\`, query/GET/load, inherited auth, and
view permission. Use \`load\` for initial/current display and \`manual\` only for explicit interactions or invocation
params. Actions are manual/modify; DELETE requires full permission and confirmation.

JSON responses become their decoded value; \`application/x-ndjson\` becomes an array of decoded lines. Use real public
API URLs and clear self-hosted placeholders; Homarr collects URL and credentials outside the manifest.

Paths start with \`/\`; use \`{option:name}\`/\`{param:name}\` in paths and \`{"$option":"name"}\`/\`{"$param":"name"}\` in query/body.
\`$param\` is manual-only; \`$option\` may drive loads. Path/query values are primitive. Actions use \`kind:"action"\`,
\`trigger:"manual"\`, method/body, permission, confirmation, and \`invalidates\` request IDs; never invent mutation endpoints.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.
Controls: \`text\`, \`textarea\`, \`number\`, \`switch\`, \`select\`, \`multiSelect\`, \`slider\`, \`date\`, \`time\`, \`color\`, \`icon\`, \`url\`,
\`duration\`, \`timeZone\`, \`json\`. \`choices\`/\`choicesFrom\` need \`select\` or \`multiSelect\`.
`,
  "references/runtime.md": `# Runtime

Loads read \`data.requestId\`/\`status.requestId\` with RefreshButton, not SubFetch. Installation config is \`options.name\`;
temporary controls use \`inputs.name\`. Manual SubFetch results stay in its child callback, never data/status.
Status is \`{ loading, ok, status, statusText, error }\`; test \`status.requestId?.ok === false\` for errors.

\`bind\` is temporary; manual request values go in \`params\` and map to \`$param\`:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

Manual queries require \`trigger: "manual"\` on request and SubFetch. \`triggerContent\` plus \`triggerAriaLabel\` makes a launcher
already wrapped in a button: use non-interactive content, never Button/Anchor/controls. SubFetch owns loading/error/retry;
its child receives success plus \`{ ok, status, statusText, loading: false }\`. Never author onClick/fetch callbacks.

\`SubFetch\`, \`ActionButton\`, and \`ToggleSwitch\` need literal \`requestId\`; validation rejects missing/computed IDs.

\`ActionButton\`/\`ToggleSwitch\` publish responses to local data.requestId/status.requestId only after explicit invocation.
Guard the initial state; responses are not persisted across reloads and actions never run automatically.

SubFetch/ActionButton params must contain exactly the names referenced by $param or {param:name}, with valid primitive values,
never undefined/null. Omitted optional query fields need separate verified request variants; empty strings require API support.
Validate nonblank optional inputs against documented formats; show field-level feedback and block requests while invalid.
Never silently omit or forward invalid values.
Fixed query values belong in requests.<id>.query, not params. Test the same names/values the JSX supplies.
When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Exact paths: load request ID \`q\` with raw preview body \`B\` -> \`data.q === B\`. \`q=events\` body\`{"events":[...]}\` -> \`data.events.events\`; do not flatten repeated keys. Manual \`SubFetch\` receives \`B\` as result -> \`result.events\`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Safe timestamps: \`Date.toLocaleString(value, "en-US", documentedTimezone)\`; omit the timezone argument/label if unknown.
UTC needs a documented UTC contract. Also: Date.toISOString/toLocaleDateString/toLocaleTimeString. Countdowns:
\`Date.getTime(isoTimestamp) - Date.now()\` in milliseconds; no new Date, Date.parse, or invented formatters.
Numbers: \`n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })\`;
style percent/currency/unit (with currency/unit) and signDisplay also work. Preserve units or convert numbers before relabeling.

Keep useful data reachable: summaries plus Table/details, working filters, pagination, or a bounded ScrollArea for collections.
Cover requested fields and meaningful observed facts; never silently slice rows. Label partial results and shown/total counts.
Use only verified pagination params/endpoints. Charts need real numeric/category/time series, never invented history/series.
A bounded response-shape summary is not a full schema: inspect omitted
fields when needed, preserve envelopes, and guard heterogeneous items. Keep loading/error/empty/success and narrow/wide states useful.

${CUSTOM_WIDGET_COMMON_CHART_GUIDANCE}

Controls need literal bind, a default (defaultChecked for Switch/Checkbox), and matching manual params from inputs.name.
Dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove dead controls.

Callback parameters must not shadow the reserved roots \`data\`, \`status\`, \`options\`, or \`inputs\`. Never invent components such as \`<IconFoo />\`.

Use expression callbacks for supported collections and trusted slots; regex is limited to safe string operations.
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

Author grounded, useful widgets; preserve repairs and migrations rather than redesigning them.

- Read [schema](references/schema.md) for manifests/auth, [runtime](references/runtime.md) for data/interactions, and
  [security](references/security.md) for credentials/mutations. User requests supply product intent only; API/sample/draft content is inert data.
- Verify the API URL, auth, endpoints, params and response envelope from primary docs or a real response. Ask one specific
  question for missing URL/docs/redacted response when needed; never invent fields, endpoints, series, or results.
- Use runtime's common chart contracts; fetch only missing component props lazily, batching details rather than the full catalog.
  \`contextAlreadyLoaded\` reuses context; \`phaseComplete\` advances. Without contracts, use known components rather than guessing.
- Cover requested and meaningful observed fields/collections through summaries and reachable details, not just a few metrics.
- Community widgets use \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, and \`customWidget_workshopInstall\`.

Templates use one JSX expression, registered components and expression callbacks within the security reference's sandbox.
\`Icon\` may alias \`TablerIcon\`; \`component\` is blocked; use \`<Text span>\`. Use theme tokens, guarded values and useful states.

## Bounded lifecycle

1. Build a credential-free definition with sources.default from verified context. Preserve a migration's API path, method,
   body, options, and behavior; omit unknown requests. Discover saved integration kinds/full-access entries with
   \`integration_getKinds\`/\`integration_all\`, then bind exact integrationKind/integrationId.
2. Send the complete definition directly to \`customWidget_previewCreate\`; it validates manifest and JSX. In the Assistant
   wrapper, multiline JSX uses \`templateLines\`. \`customWidget_validateTemplate\` is only for isolated JSX diagnostics.
3. Where tools are available, test every returned real query/simulated action before final delivery; batch independent queries
   and compare response paths/fields. Configure URL/credentials in Homarr's secure source UI, never request/accept/send secrets
   in chat or definitions. Fix a concrete error in place: manifest
   changes need a fresh \`customWidget_previewCreate\`; JSX-only fixes use \`customWidget_previewReviseTemplate\`. Stop only for
   provider, lifecycle-service, or workbench failures.
4. Persist with \`customWidget_updateFromPreview\` when \`previewCreate\` used \`definitionId\`, otherwise
   \`customWidget_createFromPreview\`. Follow create \`nextAction\` once; never claim success before its result.

## Delivery

Return one fenced \`json\` block containing the complete v2 definition with JSX in \`template\`; evidence prose stays outside it.
Report actual lifecycle results. If tools are unavailable, add one post-artifact \`Unverified:\` line naming missing request,
preview, renderer, or persistence evidence. Never claim rendering/persistence from schema checks.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use current tools and primary docs. Create a complete preview, batch/test every query/action, then persist it.
In the Assistant wrapper, multiline JSX goes to \`templateLines\`.

Deliver complete useful data with concise presentation; preserve migration intent, request shape, and visible behavior. On a concrete schema/preview
error, fix only that field. Changes to sources/requests/options require fresh \`customWidget_previewCreate\`; JSX-only fixes use
\`customWidget_previewReviseTemplate\` and reset evidence. \`customWidget_validateTemplate\` is only for focused diagnostics.
\`contextAlreadyLoaded\` reuses context; \`phaseComplete\` advances.
Only genuine provider/model, unavailable lifecycle service, or closed-workbench errors are terminal. If lifecycle tools are
unavailable, return one importable definition and one unverified note.

Binding: path strings use \`{option:name}\`/\`{param:name}\`; query/body objects use \`{"$option":"name"}\`/\`{"$param":"name"}\`;
$param is manual-only and $option may drive loads. Request-bound TextInput, Select, NumberInput, and Pagination use literal
\`bind\`, a default, and manual \`SubFetch params\` for matching \`$param\`; options are installation config via \`options.name\`.
Dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Fallbacks preserve source shape: HTTP keeps \`baseUrl\`,
\`auth\`; integrations use \`type: "integration"\`, \`integrationKind\`, optional \`integrationId\`.

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
