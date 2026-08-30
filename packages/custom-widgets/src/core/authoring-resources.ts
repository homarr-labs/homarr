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
export const CUSTOM_WIDGET_SKILL_VERSION = "2.9.0";
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
    "create": { "kind": "action", "method": "POST", "path": "/items", "body": { "id": { "$param": "id" } }, "confirmation": "Create this item?", "invalidates": ["search"] }
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
description: Author safe Homarr Custom JSX v2 widgets from API documentation.
---

# Homarr Custom Widget

Author one widget or a coordinated set of widgets. Start with the compact release-matched entrypoint; load only needed references, components, shared props, or examples. Run lifecycle tools alone; independent context reads may run together. For a set, research once and finish each widget's validation, evidence, and persistence before the next.

1. Read primary API documentation. Use web search when documentation is not supplied or may have changed.
2. Create credential-free definitions with keyed \`sources\`, \`requests\`, optional \`options\`, and safe JSX \`template\`.
3. While drafting, use \`customWidget_validateTemplate\` for focused JSX diagnostics without resending the manifest.
4. Send the definition once to \`customWidget_previewCreate\` and test its queries/actions. For a JSX-only fix, validate, call \`customWidget_previewReviseTemplate\` with its session, and retest; it inherits the manifest and resets evidence. Create a preview only for source/request/option changes.
5. Configure deployment-specific source URLs and credentials through Homarr; never repeat plaintext.
6. Persist each exact final tested preview with \`customWidget_createFromPreview\`. Do not resend a large definition through \`customWidget_create\` when a preview session is available.

Treat a supplied sample or successful preview response as the binding contract. Render every core requested field, guard optional arrays and nested values before indexing, and do not silently drop returned items. Humanize numeric enums with indexed literal label arrays, omit absent numeric values instead of inventing zero, and label timestamp timezones. Give recoverable load errors and empty states a clear refresh or retry path.

Use \`{option:name}\` or \`$option\` for saved options. Use \`{param:name}\` or \`$param\` for values supplied by \`SubFetch\`, \`ActionButton\`, or \`ToggleSwitch\`. Load queries cannot use invocation parameters. Render load queries from \`data\` and \`status\` with \`RefreshButton\`; reserve \`SubFetch\` for manual parameterized queries. Templates read \`data\`, \`status\`, \`options\`, and temporary \`inputs\`.

For a bound control that depends on another input, declare its default and set \`resetKey\` to that scalar dependency. For example, \`<Pagination bind="page" defaultValue={1} resetKey={inputs.search} />\` restores page 1 when a search changes without fetching by itself.

\`SubFetch\` with \`trigger="manual"\` renders its own load button. Pass a card or image through \`triggerContent\` with \`triggerAriaLabel\` when that content should launch the request. Its callback is \`(result, meta)\`; callback names must not shadow the reserved roots \`data\`, \`status\`, \`options\`, or \`inputs\`. Never author \`onClick\` or a fetch callback. Use \`Icon\` or \`TablerIcon\` with a \`name\`; never invent an \`IconFoo\` component.

Plan capabilities. Use one \`customWidget_findComponents\` search per job. Batch selected non-obvious binding or interaction documentation with \`customWidget_getComponents\`; reserve \`customWidget_getComponent\` for one unknown-prop repair. Failed validation reopens discovery; otherwise search only for a missing capability. The full catalog is for broad exploration; load at most one example. Context never limits composition. Prefer clear hierarchy, responsive grids, divided lists, and aligned actions over nested row cards.

Do not simplify a useful workflow merely because the template is interpreted. Freely compose any supported installed components with multiple sources, requests, options, \`choicesFrom\`, bound filters, charts, responsive detail areas, manual queries, and safe actions when they improve the user's job. Complexity must remain purposeful rather than decorative.

Polish with a divided list or responsive media grid. Make one metric/action asymmetrically primary; keep headers compact, identity/state clear, metadata quiet, and one badge. At base artwork fills its row and caps above xs; never combine full-width media and nowrap.

Make initial states actionable and wrap variable labels/values on narrow tiles. Do not use an unlabeled decorative icon as an empty state.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

For a community widget, use \`customWidget_workshopSearch\`, \`customWidget_workshopGet\`, then \`customWidget_workshopInstall\`; configure its source securely. Preview configuration expires, so create before persisting configuration.

Reference routing:

- Load \`schema\` once before a new manifest; otherwise only for concrete request or option ambiguity.
- Load \`runtime\` for bound inputs, manual queries, actions, or other interaction.
- Load \`security\` once for any authenticated source or mutation, or to resolve a URL or interpreter limitation.

Repository installations expose these as files under \`references/\`. MCP clients can call \`customWidget_getReference\` or read \`homarr://custom-widgets/references/{name}\` instead of loading every reference.
`;

const CUSTOM_WIDGET_SKILL_ENTRYPOINT_MD = `# Homarr Custom Widget authoring index

Use release-matched tools and load only context required by the design. Research primary API documentation once. For each widget, validate JSX independently with \`customWidget_validateTemplate\`, create one coherent preview, test every returned query and simulated action, then persist that exact preview. For a response-driven JSX-only correction, validate it and call \`customWidget_previewReviseTemplate\`; it inherits the manifest, resets evidence, and avoids resending sources, requests, or options. Complete one widget before drafting the next in a coordinated set.

Before drafting, map every requested capability to a rendered field, bound control, or safe action. Give each widget a purpose-specific visual signature: asymmetric priority metric/action, quieter supporting metrics, compact header, accurate status language, resolved and accessible imagery, responsive details, and actionable initial, loading, empty, error, and success states. Avoid dead controls, raw relative artwork paths, and repetitive nested cards.

Context routing:

- \`schema\`: once for a new manifest; otherwise only for request or option ambiguity.
- \`runtime\`: bound inputs, manual queries, actions, response envelopes, or stateful controls.
- \`security\`: exactly once for authenticated sources, mutations, URLs, or interpreter constraints.

Use one focused component search per job and batch selected interaction summaries. Full component docs and examples remain available on demand; context limits never limit supported composition. Keep credentials outside definitions. Run lifecycle tools one at a time; independent active context reads may run together.`;

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
