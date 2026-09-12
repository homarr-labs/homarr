import type { CustomJsxAuthoringCatalog, CustomJsxComponentApi } from "./component-catalog-types";

const definitions = [
  {
    name: "ContentSaveButton",
    description: "Explicitly saves one declared shared content draft using its revision and server permissions.",
    props: { name: "string" },
  },
  {
    name: "ContentResetButton",
    description: "Reloads one declared shared content value, discarding its local draft or resolving a conflict.",
    props: { name: "string" },
  },
  {
    name: "View",
    description: "Renders a declared v3 JSX fragment using values exposed as props inside that fragment.",
    props: { name: "string", values: "Record<string, unknown>" },
  },
  {
    name: "WidgetModal",
    description: "Opens a widget-owned accessible modal from its triggerLabel. Content retains scoped styles.",
    props: { title: "string", triggerLabel: "string", size: "string | number" },
  },
  {
    name: "WidgetDrawer",
    description: "Opens a widget-owned detail drawer from its triggerLabel. Content retains scoped styles.",
    props: {
      title: "string",
      triggerLabel: "string",
      size: "string | number",
      position: "'left' | 'right' | 'top' | 'bottom'",
    },
  },
  {
    name: "AppEmbed",
    description: "Embeds a browser-reachable HTTP application in an isolated frame. The service must permit framing.",
    props: { src: "string", title: "string", height: "number", allowForms: "boolean" },
  },
  {
    name: "NativeQuery",
    description:
      "Runs a curated Homarr integration query. A child slot receives (data, meta); live streams require host support.",
    props: {
      nativeId: "string",
      params: "Record<string, string | number | boolean>",
      trigger: "'auto' | 'manual'",
      live: "boolean",
      label: "string",
    },
  },
  {
    name: "NativeActionButton",
    description: "Invokes a declared curated native action through Homarr permissions and preview simulation.",
    props: {
      nativeId: "string",
      params: "Record<string, string | number | boolean>",
      color: "string",
      variant: "string",
      disabled: "boolean",
    },
  },
] as const;

export function withCustomWidgetExtensionCatalog(catalog: CustomJsxAuthoringCatalog): CustomJsxAuthoringCatalog {
  const types = [...catalog.types];
  const typeRef = (value: string) => {
    const existing = types.indexOf(value);
    if (existing >= 0) return existing;
    return types.push(value) - 1;
  };
  const components: CustomJsxComponentApi[] = definitions.map((entry) => ({
    name: entry.name,
    package: "@homarr/widgets",
    category: "interaction",
    safety: "wrapped",
    description: entry.description,
    documentationUrl: "https://homarr.dev/docs/management/custom-widgets/custom-jsx/",
    props: Object.entries(entry.props).map(([name, type]) => ({
      name,
      typeRef: typeRef(type),
      required: ["nativeId", "title", "triggerLabel", "src", "name"].includes(name),
      source: "component",
    })),
    blockedProps: [],
    subcomponents: [],
    accessibilityRequirements: ["Provide a descriptive trigger or frame title."],
  }));
  const result: CustomJsxAuthoringCatalog = {
    ...catalog,
    customWidgetVersion: "3.0.0",
    types,
    globalProps: [
      ...catalog.globalProps.filter((entry) => !["className", "persist", "content"].includes(entry.name)),
      ...["persist", "content"].map((name) => ({
        name,
        typeRef: typeRef("string"),
        required: false,
        source: "global" as const,
        description: "For bound controls only: literal v3 preference or shared-content declaration name.",
      })),
      {
        name: "className",
        typeRef: typeRef("string"),
        required: false,
        source: "global",
        description: "Space-separated local classes from the v3 scoped stylesheet.",
      },
    ],
    blockedCapabilities: catalog.blockedCapabilities.filter((entry) => entry.name !== "className"),
    components: [
      ...catalog.components
        .filter((entry) => !definitions.some((definition) => definition.name === entry.name))
        .map((component) => {
          if (!component.bind) return component;
          return {
            ...component,
            props: component.props.filter((entry) => !["persist", "content"].includes(entry.name)),
          };
        }),
      ...components,
    ],
  };
  const sortedTypes = types.toSorted();
  const remap = (prop: CustomJsxAuthoringCatalog["globalProps"][number]) => ({
    ...prop,
    typeRef: sortedTypes.indexOf(types[prop.typeRef] ?? "unknown"),
  });
  result.types = sortedTypes;
  result.globalProps = result.globalProps.map(remap).toSorted(byName);
  result.components = result.components
    .map((component) => ({ ...component, props: component.props.map(remap).toSorted(byName) }))
    .toSorted(byName);
  return result;
}

function byName(left: { name: string }, right: { name: string }) {
  if (left.name === right.name) return 0;
  if (left.name < right.name) return -1;
  return 1;
}
