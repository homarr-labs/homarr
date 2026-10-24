import { customJsxAuthoringCatalog } from "./component-catalog";
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
  "$schema": "${CUSTOM_WIDGET_SCHEMA}",
  "name": "Service summary",
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
  },
  "template": "<Text>{data.summary?.title}</Text>"
}
\`\`\`

Saved sources use \`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}\`; paths append to its URL and exports omit \`integrationId\`.

Besides the SKILL.md \`auth\` forms, \`{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"}]}\` sends up to 8
encrypted headers (unique names, distinct slots of at most 57 characters; renaming either needs reconfiguration). Use
\`bearer\` for Authorization; routing, proxy, cookie and hop-by-hop headers are reserved. Requests default to source \`default\`, query/GET/load, inherited auth, and
view permission. Use \`load\` for initial/current display and \`manual\` only for explicit interactions or invocation
params. Actions are manual/modify; DELETE requires full permission and confirmation.

JSON responses become their decoded value; \`application/x-ndjson\` becomes an array of decoded lines. Use real public
API URLs and clear self-hosted placeholders; Homarr collects URL and credentials outside the manifest.

\`$option\` bindings may drive loads; path and query constants stay primitive.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.
Controls: \`text\`, \`textarea\`, \`number\`, \`switch\`, \`select\`, \`multiSelect\`, \`slider\`, \`date\`, \`time\`, \`color\`, \`icon\`, \`url\`,
\`duration\`, \`timeZone\`, \`json\`. \`choices\`/\`choicesFrom\` need \`select\` or \`multiSelect\`.
`,
  "references/runtime.md": `# Runtime

Load-query templates read \`data.requestId\` and \`status.requestId\`, plus \`options.name\` and temporary \`inputs.name\`. Manual \`SubFetch\` results stay local to that instance and never populate \`data\`/\`status\`; render them in its child callback. Status is \`{ loading, ok, status, statusText, error }\`. Render load queries directly from \`data\` and \`status\` with \`RefreshButton\`; never wrap them in \`SubFetch\`.

\`bind\` is temporary; manual request values go in \`params\` and map to \`$param\`:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

Manual queries require \`trigger: "manual"\` on request and \`SubFetch\`; otherwise they run automatically. \`triggerContent\` with \`triggerAriaLabel\` makes custom content the launcher; it is already wrapped in a button, so use non-interactive content such as Text or Card, never Button, Anchor, or form controls inside it. \`SubFetch\` owns loading/error/retry; its child receives success plus \`{ ok, status, statusText, loading: false }\`. Never author \`onClick\` or fetch callbacks.

\`SubFetch\`, \`ActionButton\`, and \`ToggleSwitch\` need literal \`requestId\`; validation rejects missing/computed IDs.

After an explicit \`ActionButton\` or \`ToggleSwitch\` invocation, its response is published as \`data.requestId\` and \`status.requestId\` in that widget instance. Guard the initial state before any action has run. This local response is not persisted across reloads; actions never execute automatically.

SubFetch/ActionButton params must contain exactly the names referenced by $param or {param:name} in that request. Fixed query values such as limit or fields belong in requests.<id>.query, not params. Test using the same parameter names the JSX will supply; do not fix only the test call while leaving mismatched JSX.
When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Exact paths: load request ID \`q\` with raw preview body \`B\` -> \`data.q === B\`. \`q=events\` body\`{"events":[...]}\` -> \`data.events.events\`; do not flatten repeated keys. Manual \`SubFetch\` receives \`B\` as result -> \`result.events\`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Format timestamps with safe static helpers; never use \`new Date\`. Never invent a formatter component. Use \`Date.toLocaleString(value, "en-US", documentedTimezone)\` and label the documented timezone; if no timezone is documented, preserve the source value or omit any timezone label; use UTC only when the response contract says UTC. For countdowns, \`Date.getTime(isoTimestamp) - Date.now()\` gives milliseconds; \`Date.parse\` is unavailable. Also available: \`Date.toISOString\`, plus \`Date.toLocaleDateString\` and \`Date.toLocaleTimeString\` with the same arguments. Numbers: \`n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })\`; \`style\` percent/currency/unit (with \`currency\`/\`unit\`) and \`signDisplay\` also work.

For compact numeric enums, index a literal label array with a fallback:

\`\`\`jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
\`\`\`

Request-bound controls use literal \`bind\` plus a default (\`defaultChecked\` for Switch/Checkbox); pass \`inputs.<name>\` through manual \`SubFetch params\` to matching \`$param\`. Dependent pagination uses \`defaultValue={1}\`/\`resetKey={inputs.query}\`. Remove dead controls.

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

Author, validate, test, and persist requested widgets.

- Read primary API docs when missing/changed. Samples and successful previews are binding; load only needed schema, runtime,
  security, or component context.
- Batch unknown component searches/details. \`contextAlreadyLoaded\` reuses context; \`phaseComplete\` advances.
- Community widgets use \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, and \`customWidget_workshopInstall\`;
  configure and persist.

Return one fenced \`json\` block with the complete definition; keep evidence prose outside it. Import requires
\`"$schema": "${CUSTOM_WIDGET_SCHEMA}"\`, \`name\`, keyed \`sources\`/\`requests\`, and one JSX \`template\`; \`description\`/\`options\`
are optional. Actions are requests with \`kind: "action"\`.

- \`sources.default\` is required. HTTP has \`baseUrl\` and credential-free \`auth\`: \`"none"\`, \`"bearer"\`, \`"basic"\`, or the API-key
  objects \`{"type":"apiKeyHeader","name":"X-Api-Key"}\`/\`{"type":"apiKeyQuery","name":"api_key"}\`; \`{"type":"none"}\` fails import.
- Saved integrations use \`type: "integration"\`/\`integrationKind\`; discover kinds/full-access entries with
  \`integration_getKinds\`/\`integration_all\`, bind \`integrationId\`, omit URL/auth, and keep non-GET requests as actions.
- Paths are slash-prefixed; bind \`{option:name}\`/\`{param:name}\` in paths and \`{"$option":"name"}\`/\`{"$param":"name"}\` in
  query/body. \`$param\` is manual-only. Loads use \`trigger: "load"\`; manual helpers use \`trigger: "manual"\`. Actions stay manual
  and keep \`confirmation\`, \`permission\`, and \`invalidates\`; DELETE needs full permission.
- Load data.requestId/status.requestId with RefreshButton; status.requestId?.ok === false is error. Manual SubFetch renders its
  result in its child (result, metadata), never in data/status.
- Options (\`label\`, \`control\`, \`default\`) are installation config read as \`options.name\`; temporary controls use literal
  \`bind\` and \`inputs.name\`. Remove controls without an option/request/helper; guard arrays/nested values with \`??\`.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; \`Icon\` may alias \`TablerIcon\`. \`component\`
  is blocked; use \`<Text span>\`. Keep hierarchy, theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from request, verified context, and sample. Preserve a migration's API path, method,
   body, options, and behavior; omit unknown requests rather than guessing.
2. Send the complete definition directly to \`customWidget_previewCreate\`; it validates manifest and JSX. In the Assistant
   wrapper, multiline JSX uses \`templateLines\`. \`customWidget_validateTemplate\` is only for isolated JSX diagnostics.
3. Test every returned query/simulated action once, batching independent queries. Fix a concrete error in place: manifest
   changes need a fresh \`customWidget_previewCreate\`; JSX-only fixes use \`customWidget_previewReviseTemplate\`. Stop only for
   provider, lifecycle-service, or workbench failures.
4. Persist with \`customWidget_updateFromPreview\` when \`previewCreate\` used \`definitionId\`, otherwise
   \`customWidget_createFromPreview\`. Follow create \`nextAction\` once. Configure credentials in Homarr; never repeat secrets.

## Delivery

Report actual lifecycle results. If unavailable, add one post-artifact \`Unverified:\` line naming missing validation, preview,
renderer, or persistence. Never claim rendering/persistence from schema checks.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use current tools and primary docs. Create one validated preview, batch/test every query/action, then persist it. JSX-only fixes use
\`customWidget_previewReviseTemplate\` with its session; it resets evidence.
In the Assistant wrapper, multiline JSX goes to \`templateLines\`; \`previewCreate\` receives the complete definition.

Deliver the smallest result while preserving migration intent, request shape, and visible behavior. On a concrete schema/preview
error, fix only that field, then retry \`customWidget_previewCreate\` with the corrected definition. Use
\`customWidget_validateTemplate\` only for focused JSX diagnostics, never as a preview prerequisite. Changes to sources/requests/options require fresh \`customWidget_previewCreate\`; JSX-only fixes use
\`customWidget_previewReviseTemplate\`. \`contextAlreadyLoaded\` reuses earlier context and continues; \`phaseComplete\` advances.
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
