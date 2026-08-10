import {
  customJsxAuthoringCatalog,
  customJsxCatalogGlobalPropByName,
  resolveCustomJsxPropDescriptor,
} from "./component-catalog";
import { BUNDLED_CUSTOM_WIDGETS } from "./bundled-widgets";
import { customJsxExamples } from "./examples";
import { customJsxTablerIconNames } from "./tabler-icons";

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_VERSION = "2.3.0";

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

Sources require \`default\`. A request defaults to the default source, query, GET, load, inherited auth, and view permission. An action defaults to manual and modify permission. DELETE uses full permission and confirmation.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Paths use \`{option:name}\` and \`{param:name}\`. Query/body data uses \`{ "$option": "name" }\` and \`{ "$param": "name" }\`. Load queries cannot use params. Runtime parameter names and primitive values are inferred from references.

Every option has \`label\`, \`control\`, and \`default\`. Optional fields are \`description\`, \`choices\`, \`choicesFrom\`, \`min\`, \`max\`, \`step\`, \`advanced\`, and \`group\`.
`,
  "references/runtime.md": `# Runtime

Templates read \`data.requestId\`, \`status.requestId\`, \`options.name\`, and temporary \`inputs.name\`. Status contains \`loading\`, \`ok\`, \`status\`, \`statusText\`, and \`error\`.

\`bind="search"\` creates an in-memory input. It is never persisted. Supply invocation values only through \`params\`, for example:

\`\`\`jsx
<TextInput bind="search" label="Search" />
<SubFetch requestId="search" params={{ query: inputs.search }}>
  {(items) => <Stack>{(items ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
\`\`\`

\`SubFetch\` with \`trigger="manual"\` renders its own load button. To make a card or image launch the request, pass that node through \`triggerContent\` and provide \`triggerAriaLabel\`; Homarr supplies the click and keyboard behavior. Its optional second callback argument contains \`{ ok, status, statusText, loading: false }\`; loading and request failures are rendered by \`SubFetch\` before the callback runs. Do not author \`onClick\` or a fetch callback.

Use expression callbacks for supported collection methods and trusted slots. Do not use callback blocks, IIFEs, authored recursion, or raw events. Bounded regex literals work only with safe string matching/replacement operations.
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

Author one widget at a time. When connected to Homarr, retrieve \`homarr://custom-widgets/schema\` and only the component resources needed for the design. The live resources are authoritative for the installed release.

Keep documentation retrieval targeted: fetch at most eight named component documents before the first validation, or at most four after loading a complete example. Fetch another component only when a validation issue or a concrete missing interaction requires it; never load the catalog component-by-component.

1. Read the API documentation.
2. Create one credential-free widget with keyed \`sources\`, keyed \`requests\`, optional keyed \`options\`, and safe JSX \`template\`.
3. Validate, preview, test queries and simulated actions, visually inspect, and iterate.
4. Configure deployment-specific source URLs and request credentials through Homarr; never repeat plaintext.
5. Save only after narrow/wide, light/dark, loading, empty, error, and success states work. When connected through MCP, persist the exact final tested preview with \`customWidget_createFromPreview\`; do not resend a large template through \`customWidget_create\` unless no preview session is available.

Treat a supplied sample or successful preview response as the binding contract. Render every core requested field, guard optional arrays and nested values before indexing, and do not silently drop returned items. Show concise freshness context when the API supplies a timestamp. Give recoverable load errors and empty states a clear refresh or retry path.

Use \`{option:name}\` or \`$option\` for saved options. Use \`{param:name}\` or \`$param\` for values supplied by \`SubFetch\`, \`ActionButton\`, or \`ToggleSwitch\`. Load queries cannot use invocation parameters. Templates read \`data\`, \`status\`, \`options\`, and temporary \`inputs\`.

\`SubFetch\` with \`trigger="manual"\` renders its own load button. Pass a card or image through \`triggerContent\` with \`triggerAriaLabel\` when that content should launch the request. Its callback is \`(result, meta)\`; never author \`onClick\` or a fetch callback.

Use standard Mantine compound names and deliberate visual hierarchy, spacing, restrained semantic color, and responsive layouts. Avoid excessive nested cards.

Aim for distinctive polish without decorative gradients or fragile custom styling: use one semantic accent, clear surface contrast, purposeful typography, and compact rows that remain scannable in narrow tiles. Give standalone icons an accessible label or pair them with visible text.

Make initial states actionable with an example, useful hint, or clear next step. Use wrapping groups for variable-length labels and values on narrow tiles. Do not use an unlabeled decorative icon as an empty state.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

To install an existing widget, use \`customWidget_workshopSearch\`, inspect it with \`customWidget_workshopGet\`, then use \`customWidget_workshopInstall\`. Configure each self-hosted source afterward with \`customWidget_sourceConfigure\`, or call \`customWidget_configurationRequestUser\` so the user can enter the server URL and credentials directly in Homarr.

Preview-scoped configuration expires with the preview. To persist user-entered values for a new widget, create the widget first, request configuration for its definition ID, then create a final preview with that definition ID so Homarr loads the stored credentials.

When this skill is installed from the repository, optional offline details are in \`references/schema.md\`, \`references/runtime.md\`, and \`references/security.md\`. MCP-only clients should use the live Homarr resources instead.
`;

const CUSTOM_WIDGET_SKILL_BUNDLE_MD = [
  CUSTOM_WIDGET_SKILL_MD.trimEnd(),
  ...Object.entries(CUSTOM_WIDGET_SKILL_REFERENCES).map(
    ([file, content]) => `\n\n---\n\n# Bundled file: ${file}\n\n${content.trimEnd()}`,
  ),
].join("");

const pokedexAuthoringExample = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex");

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

export function getCustomWidgetSkillContent() {
  return CUSTOM_WIDGET_SKILL_BUNDLE_MD;
}

export function getCustomWidgetComponentCatalog() {
  return {
    schemaVersion: customJsxAuthoringCatalog.schemaVersion,
    mantineVersion: customJsxAuthoringCatalog.mantineVersion,
    customWidgetVersion: customJsxAuthoringCatalog.customWidgetVersion,
    components: customJsxAuthoringCatalog.components.map(({ name, category, safety }) => ({ name, category, safety })),
    sharedProps: {
      count: customJsxAuthoringCatalog.globalProps.length,
      names: customJsxAuthoringCatalog.globalProps.map(({ name }) => name),
      fetchTool: "customWidget_getSharedProps" as const,
      maxPerRequest: 64,
    },
    blockedCapabilities: customJsxAuthoringCatalog.blockedCapabilities,
    examples: getCustomWidgetExampleCatalog(),
  };
}

export function getCustomWidgetExampleCatalog() {
  return [
    ...customJsxExamples.map(({ id, title, description }) => ({ id, title, description })),
    ...(pokedexAuthoringExample
      ? [
          {
            id: "pokedex",
            title: "Complete Pokédex",
            description:
              "A production-safe PokéAPI browser with searchable species, artwork, types, abilities, base stats, loading states, and manual detail requests.",
          },
        ]
      : []),
  ];
}

export function getCustomWidgetComponent(name: string) {
  const canonicalName = name === "Icon" ? "TablerIcon" : name;
  const component = customJsxAuthoringCatalog.components.find((candidate) => candidate.name === canonicalName);
  if (!component) return null;
  return {
    schemaVersion: customJsxAuthoringCatalog.schemaVersion,
    mantineVersion: customJsxAuthoringCatalog.mantineVersion,
    customWidgetVersion: customJsxAuthoringCatalog.customWidgetVersion,
    name: component.name,
    package: component.package,
    category: component.category,
    safety: component.safety,
    description: component.description,
    props: component.props.map((prop) => resolveCustomJsxPropDescriptor(prop)),
    blockedProps: component.blockedProps,
    bind: component.bind,
    subcomponents: component.subcomponents,
    accessibilityRequirements: component.accessibilityRequirements,
    documentationUrl: component.documentationUrl,
    sharedProps:
      component.safety === "denied"
        ? undefined
        : {
            catalogField: "sharedProps.names" as const,
            fetchTool: "customWidget_getSharedProps" as const,
            maxPerRequest: 64,
            appliesExceptBlockedProps: true as const,
          },
    knownValues: component.name === "TablerIcon" ? { name: customJsxTablerIconNames } : undefined,
    deniedReason: component.deniedReason,
  };
}

export function getCustomWidgetSharedProps(names: readonly string[]) {
  const props: ReturnType<typeof resolveCustomJsxPropDescriptor>[] = [];
  const notFound: string[] = [];
  for (const name of new Set(names)) {
    const prop = customJsxCatalogGlobalPropByName.get(name);
    if (prop) props.push(resolveCustomJsxPropDescriptor(prop));
    else notFound.push(name);
  }
  return { props, notFound };
}

export function getCustomWidgetExample(name: string) {
  if (name === "pokedex" && pokedexAuthoringExample) {
    return {
      id: "pokedex",
      title: "Complete Pokédex",
      description:
        "A production-safe PokéAPI browser with searchable species, artwork, types, abilities, base stats, loading states, and manual detail requests.",
      widget: pokedexAuthoringExample.widget,
    };
  }
  return customJsxExamples.find((example) => example.id === name) ?? null;
}
