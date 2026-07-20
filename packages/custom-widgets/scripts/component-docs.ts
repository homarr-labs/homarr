import type {
  CustomJsxAuthoringCatalog,
  CustomJsxComponentApi,
  CustomJsxLiteralValue,
  CustomJsxPropDescriptor,
} from "../src/core/component-catalog-types";
import type { CustomJsxComponentPackage } from "../src/core/component-types";

export const GENERATED_COMPONENT_REFERENCE_PATHS = ["components.md", "homarr-components.md"] as const;

export type GeneratedComponentReferencePath = (typeof GENERATED_COMPONENT_REFERENCE_PATHS)[number];

const packageReferences = [
  {
    packageName: "@mantine/core",
    path: "mantine-core.md",
    title: "Mantine Core",
  },
  {
    packageName: "@mantine/dates",
    path: "mantine-dates.md",
    title: "Mantine Dates",
  },
  {
    packageName: "@mantine/charts",
    path: "mantine-charts.md",
    title: "Mantine Charts",
  },
  {
    packageName: "@homarr/widgets",
    path: "homarr-components.md",
    title: "Homarr components",
  },
] as const satisfies readonly {
  packageName: CustomJsxComponentPackage;
  path: string;
  title: string;
}[];

export function renderCustomWidgetComponentReferences(
  catalog: Readonly<CustomJsxAuthoringCatalog>,
): Readonly<Record<GeneratedComponentReferencePath, string>> {
  validateCatalogReferences(catalog);

  const references = Object.fromEntries([
    ["components.md", renderCatalogOverview(catalog)],
    ["homarr-components.md", renderPackageReference(catalog, "@homarr/widgets", "Homarr components")],
  ]) as Record<GeneratedComponentReferencePath, string>;

  return references;
}

export function getComponentReferenceAnchor(name: string): string {
  return `component-${[...name]
    .map((character) =>
      /^[a-z0-9-]$/iu.test(character) ? character.toLowerCase() : `-${character.codePointAt(0)?.toString(16)}-`,
    )
    .join("")}`;
}

function renderCatalogOverview(catalog: Readonly<CustomJsxAuthoringCatalog>): string {
  const lines = [
    "# Component catalog",
    "",
    generatedNotice(catalog),
    "",
    "This is the complete Custom JSX component boundary for this Homarr release. The machine-readable `component-catalog.json` contains exact generated component, prop, binding, and safety metadata; these Markdown pages provide the human-readable inventory and upstream Mantine indexes. Ordinary serializable props pass through unless the capability boundary explicitly blocks them.",
    "",
    "## Package references",
    "",
    ...packageReferences.map(({ packageName, path, title }) => {
      const components = catalog.components.filter((component) => component.package === packageName);
      const enabledCount = components.filter((component) => component.safety !== "denied").length;
      const deniedCount = components.length - enabledCount;
      return `- [${title}](${path}) — ${enabledCount} enabled, ${deniedCount} denied`;
    }),
    "",
    "## Authoring boundary",
    "",
    "- Use the exact component names below. Compound names such as `Tabs.List`, `Card.Section`, and `Radio.Group` are distinct catalog entries.",
    "- Use the official Mantine LLM links for component props and examples. Homarr's live catalog is authoritative for availability, bindings, and blocked capabilities.",
    '- Use `bind="name"` only when a component record declares bind metadata. Read the temporary in-memory value from `inputs.name`; it is never persisted.',
    "- Ordinary authored callbacks remain blocked. Restricted collection callbacks, directly invoked zero-argument derived-value IIFEs, and `RecursiveList`'s child template may use the immutable local `const` grammar in [JSX runtime](runtime.md#immutable-local-bindings).",
    `- Use [\`RecursiveList\`](homarr-components.md#${getComponentReferenceAnchor("RecursiveList")}) for custom arbitrary-depth trees. Do not author recursion or pass a renderer callback to Mantine Tree.`,
    "- Unknown ordinary Mantine props are advisory and are not silently discarded. Every capability listed in the blocked table is rejected.",
    "",
    "## Complete enabled inventory",
    "",
    ...renderInventoryByPackage(catalog, false),
    "",
    "## Complete denied inventory",
    "",
    ...renderInventoryByPackage(catalog, true),
    "",
    "## Blocked capabilities",
    "",
    "| Kind | Name | Reason |",
    "| --- | --- | --- |",
    ...catalog.blockedCapabilities.map(
      (capability) =>
        `| ${escapeTableCell(capability.kind)} | ${renderCode(capability.name)} | ${escapeTableCell(capability.reason)} |`,
    ),
    "",
  ];

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderPackageReference(
  catalog: Readonly<CustomJsxAuthoringCatalog>,
  packageName: CustomJsxComponentPackage,
  title: string,
): string {
  const components = catalog.components.filter((component) => component.package === packageName);
  const enabled = components.filter((component) => component.safety !== "denied");
  const denied = components.filter((component) => component.safety === "denied");
  const lines = [
    `# ${title}`,
    "",
    generatedNotice(catalog),
    "",
    `Package: \`${packageName}\`. The component-specific props below supplement ordinary safe serializable Mantine props and style props. Component-specific records override ordinary behavior with the same name.`,
    "",
    ...packageGuidance(packageName),
    "",
    "## Enabled inventory",
    "",
    enabled.length > 0 ? renderCodeList(enabled.map(({ name }) => name)) : "_None._",
    "",
    "## Denied inventory",
    "",
    denied.length > 0 ? renderCodeList(denied.map(({ name }) => name)) : "_None._",
    "",
    "## Component records",
    "",
    ...components.flatMap((component) => renderComponentRecord(catalog, component)),
  ];

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderComponentRecord(
  catalog: Readonly<CustomJsxAuthoringCatalog>,
  component: Readonly<CustomJsxComponentApi>,
): string[] {
  const details = [
    `<a id="${getComponentReferenceAnchor(component.name)}"></a>`,
    `### \`${component.name}\``,
    "",
    `- Safety: \`${component.safety}\``,
    `- Category: \`${component.category}\``,
    `- Documentation: [upstream component API](${component.documentationUrl})`,
    `- Temporary bind: ${renderBinding(component)}`,
    `- Subcomponents: ${component.subcomponents.length > 0 ? renderCodeList(component.subcomponents) : "none"}`,
    `- Component-specific blocked props: ${
      component.blockedProps.length > 0
        ? component.blockedProps
            .map(({ name, reason }) => `${renderCode(name)} — ${escapeTableCell(reason)}`)
            .join(", ")
        : "none"
    }`,
    "- Accessibility:",
    ...(component.accessibilityRequirements.length > 0
      ? component.accessibilityRequirements.map((requirement) => `  - ${requirement}`)
      : ["  - No additional catalog requirement; preserve semantic labels and text alternatives."]),
  ];

  if (component.description) details.push("", component.description);
  if (component.deniedReason) details.push("", `Denied reason: ${component.deniedReason}.`);

  details.push("", "#### Component-specific props", "");
  if (component.props.length === 0) {
    details.push(
      component.safety === "denied"
        ? "_No authorable props because this component is denied._"
        : "_No component-specific props. Use the shared prop API._",
    );
  } else {
    details.push(renderPropTable(catalog, component.props));
  }
  details.push("");
  return details;
}

function renderPropTable(
  catalog: Readonly<CustomJsxAuthoringCatalog>,
  props: readonly Readonly<CustomJsxPropDescriptor>[],
): string {
  const lines = [
    "| Prop | Required | Type | Literal values | Description |",
    "| --- | --- | --- | --- | --- |",
    ...props.map((prop) => {
      const type = catalog.types[prop.typeRef];
      if (type === undefined) throw new Error(`Prop '${prop.name}' references missing type ${prop.typeRef}`);
      return `| ${renderCode(prop.name)} | ${prop.required ? "yes" : "no"} | ${renderCode(type)} | ${renderLiteralValues(prop.literalValues)} | ${escapeTableCell(prop.description ?? "—")} |`;
    }),
  ];
  return lines.join("\n");
}

function renderInventoryByPackage(catalog: Readonly<CustomJsxAuthoringCatalog>, denied: boolean): string[] {
  return packageReferences.flatMap(({ packageName, path, title }) => {
    const components = catalog.components.filter(
      (component) => component.package === packageName && (component.safety === "denied") === denied,
    );
    return [
      `### ${title}`,
      "",
      components.length > 0
        ? components
            .map((component) => {
              const target =
                component.package === "@homarr/widgets"
                  ? `${path}#${getComponentReferenceAnchor(component.name)}`
                  : component.documentationUrl;
              return `[\`${escapeMarkdownLinkLabel(component.name)}\`](${target})${component.deniedReason ? ` — ${component.deniedReason}` : ""}`;
            })
            .join(", ")
        : "_None._",
      "",
    ];
  });
}

function packageGuidance(packageName: CustomJsxComponentPackage): string[] {
  switch (packageName) {
    case "@mantine/core":
      return [
        "## Package guidance",
        "",
        "Use declarative props and `bind` adapters instead of event callbacks. Homarr scopes supported overlays to the widget root. Use Homarr's `RecursiveList` when a tree needs a custom arbitrary-depth node template.",
      ];
    case "@mantine/dates":
      return [
        "## Package guidance",
        "",
        "Date bindings are temporary serialized inputs. Persisted locale, time-zone, and date choices belong in widget options. Include a textual date or agenda when a visual date control carries meaning.",
      ];
    case "@mantine/charts":
      return [
        "## Package guidance",
        "",
        "Pass sanitized JSON data through serializable props. Use [immutable local `const` blocks](runtime.md#immutable-local-bindings) for repeated derived chart values; authored formatters and renderer callbacks remain blocked. Include a textual summary and do not rely on color alone.",
      ];
    case "@homarr/widgets":
      return [
        "## Package guidance",
        "",
        "Homarr components own controlled request, action, pagination, disclosure, icon, and recursive traversal behavior. Manual request parameters come from the invoking component's `params` prop. `RecursiveList` is the only supported arbitrary-depth authored renderer and its child template may use the restricted safe-block grammar.",
      ];
  }
}

function renderBinding(component: Readonly<CustomJsxComponentApi>): string {
  if (!component.bind) return "not available";
  const conditionalType = getConditionalBindingType(component.name);
  return `\`${component.bind.type}\` via \`${component.bind.initialProp}\`; read from \`inputs.<bindName>\`${conditionalType ? `; ${conditionalType}` : ""}`;
}

function getConditionalBindingType(componentName: string): string | null {
  if (componentName === "Accordion") return "becomes `string[]` when `multiple` is true";
  if (["Chip.Group", "ChipGroup"].includes(componentName)) return "becomes `string[]` when `multiple` is true";
  if (componentName === "TreeSelect") return "becomes `string[]` when `mode` is `multiple` or `checkbox`";
  if (
    ["DatePicker", "DatePickerInput", "MonthPicker", "MonthPickerInput", "YearPicker", "YearPickerInput"].includes(
      componentName,
    )
  ) {
    return "becomes `string[]` when `type` is `multiple` or `range`";
  }
  if (["DateTimePicker", "InlineDateTimePicker"].includes(componentName))
    return "becomes `string[]` when `type` is `range`; `multiple` is not supported";
  return null;
}

function renderLiteralValues(values: readonly CustomJsxLiteralValue[] | undefined): string {
  return values && values.length > 0
    ? values.map((value) => renderCode(JSON.stringify(value) ?? "null")).join(", ")
    : "—";
}

function renderCodeList(values: readonly string[]): string {
  return values.map(renderCode).join(", ");
}

function renderCode(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

function escapeTableCell(value: string): string {
  return escapeHtml(value).replaceAll("|", "&#124;");
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "&#124;");
}

function escapeMarkdownLinkLabel(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function generatedNotice(catalog: Readonly<CustomJsxAuthoringCatalog>): string {
  return `> Generated from \`component-catalog-v${catalog.schemaVersion}.json\`. Catalog schema v${catalog.schemaVersion} · Custom Widget ${catalog.customWidgetVersion} · Mantine ${catalog.mantineVersion}. Do not edit this file by hand.`;
}

function validateCatalogReferences(catalog: Readonly<CustomJsxAuthoringCatalog>) {
  const componentNames = catalog.components.map(({ name }) => name);
  if (new Set(componentNames).size !== componentNames.length) throw new Error("Catalog component names must be unique");
  for (const component of catalog.components) {
    if (!packageReferences.some(({ packageName }) => packageName === component.package)) {
      throw new Error(`Catalog component '${component.name}' uses unsupported package '${component.package}'`);
    }
    for (const prop of component.props) assertPropType(catalog, prop, `${component.name}.${prop.name}`);
  }
  for (const prop of catalog.globalProps) assertPropType(catalog, prop, prop.name);
}

function assertPropType(
  catalog: Readonly<CustomJsxAuthoringCatalog>,
  prop: Readonly<CustomJsxPropDescriptor>,
  label: string,
) {
  if (!Number.isSafeInteger(prop.typeRef) || catalog.types[prop.typeRef] === undefined) {
    throw new Error(`Catalog prop '${label}' references missing type ${prop.typeRef}`);
  }
}
