import {
  customJsxAuthoringCatalog,
  customJsxCatalogComponentByName,
  customJsxCatalogGlobalPropByName,
  resolveCustomJsxPropDescriptor,
} from "./component-catalog";
import type { CustomJsxComponentApi } from "./component-catalog";
import { BUNDLED_CUSTOM_WIDGETS } from "./bundled-widgets";
import { customJsxExamples } from "./examples";
import { customJsxTablerIconExamples, customJsxTablerIconNames } from "./tabler-icons";

type BundledCustomWidget = (typeof BUNDLED_CUSTOM_WIDGETS)[number];

const getBundledAuthoringExampleId = (id: BundledCustomWidget["id"]) => id.replace(/^seed-/u, "");
const getBundledAuthoringExample = (name: string) =>
  BUNDLED_CUSTOM_WIDGETS.find(({ id }) => getBundledAuthoringExampleId(id) === name);

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

const normalizeComponentSearchText = (value: string) =>
  value
    .replaceAll(/([a-z\d])([A-Z])/gu, "$1 $2")
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, " ")
    .trim();

const createComponentSearchIndex = () =>
  customJsxAuthoringCatalog.components.map((component) => {
    const name = normalizeComponentSearchText(component.name);
    const category = normalizeComponentSearchText(component.category ?? "");
    const description = normalizeComponentSearchText(component.description ?? "");
    return {
      component,
      name,
      nameTerms: new Set(name.split(" ")),
      categoryTerms: new Set(category.split(" ")),
      description,
      descriptionTerms: new Set(description.split(" ")),
    };
  });
let componentSearchIndex: ReturnType<typeof createComponentSearchIndex> | undefined;

export function findCustomWidgetComponents(query: string, limit = 16) {
  const normalizedQuery = normalizeComponentSearchText(query);
  const terms = [...new Set(normalizedQuery.split(" ").filter((term) => term.length > 1))];
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 16);
  componentSearchIndex ??= createComponentSearchIndex();
  const components = componentSearchIndex
    .map(({ component, name, nameTerms, categoryTerms, description, descriptionTerms }) => {
      let score = 0;
      if (name === normalizedQuery) score = 1_000;
      if (` ${normalizedQuery} `.includes(` ${name} `)) score += 500;
      for (const term of terms) {
        if (nameTerms.has(term)) score += 100;
        else if (name.includes(term)) score += 60;
        if (categoryTerms.has(term)) score += 20;
        if (descriptionTerms.has(term)) score += 8;
        else if (description.includes(term)) score += 2;
      }
      return { component, score };
    })
    .filter(({ score }) => score > 0)
    .toSorted((left, right) => right.score - left.score || left.component.name.localeCompare(right.component.name))
    .slice(0, boundedLimit)
    .map(({ component }) => ({
      name: component.name,
      package: component.package,
      category: component.category,
      safety: component.safety,
      description: component.description,
    }));
  return {
    query,
    components,
    nextStep:
      "Batch selected names whose exact interaction rules are needed with customWidget_getComponents. Use customWidget_getComponent only for one concrete repair, and search again only for a missing capability.",
  };
}

export function getCustomWidgetExampleCatalog() {
  return [
    ...customJsxExamples.map(({ id, title, description }) => ({ id, title, description })),
    ...BUNDLED_CUSTOM_WIDGETS.map(({ id, widget }) => ({
      id: getBundledAuthoringExampleId(id),
      title: widget.name,
      description: widget.description ?? `Bundled ${widget.name} example.`,
    })),
  ];
}

export function getCustomWidgetComponent(name: string) {
  const component = findComponent(name);
  if (!component) return null;
  return {
    ...getComponentMetadata(component),
    props: component.props.map((prop) => resolveCustomJsxPropDescriptor(prop)),
  };
}

function findComponent(name: string) {
  if (name === "Icon") return customJsxCatalogComponentByName.get("TablerIcon");
  return customJsxCatalogComponentByName.get(name);
}

function getComponentMetadata(component: CustomJsxComponentApi) {
  return {
    schemaVersion: customJsxAuthoringCatalog.schemaVersion,
    mantineVersion: customJsxAuthoringCatalog.mantineVersion,
    customWidgetVersion: customJsxAuthoringCatalog.customWidgetVersion,
    name: component.name,
    package: component.package,
    category: component.category,
    safety: component.safety,
    description: component.description,
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
    ...(component.name === "TablerIcon" && {
      knownValues: { name: customJsxTablerIconExamples },
      iconNaming: {
        availableCount: customJsxTablerIconNames.length,
        knownValuesAreExamples: true,
        filledSuffix: "-filled",
        browseUrl: "https://tabler.io/icons",
      },
    }),
    deniedReason: component.deniedReason,
  };
}

export function getCustomWidgetComponents(names: readonly string[]) {
  const components: NonNullable<ReturnType<typeof getCustomWidgetComponentBatchSummary>>[] = [];
  const notFound: string[] = [];
  for (const name of [...new Set(names)].slice(0, 8)) {
    const component = getCustomWidgetComponentBatchSummary(name);
    if (component) components.push(component);
    else notFound.push(name);
  }
  return {
    schemaVersion: customJsxAuthoringCatalog.schemaVersion,
    mantineVersion: customJsxAuthoringCatalog.mantineVersion,
    customWidgetVersion: customJsxAuthoringCatalog.customWidgetVersion,
    components,
    notFound,
    nextStep:
      "Use these compact selected docs and proceed directly to preview creation. Fetch one full component document only for a concrete unresolved prop or repair.",
  };
}

function getCustomWidgetComponentBatchSummary(name: string) {
  const component = findComponent(name);
  if (!component) return null;
  const {
    schemaVersion: _schemaVersion,
    mantineVersion: _mantineVersion,
    customWidgetVersion: _customWidgetVersion,
    knownValues: _knownValues,
    ...metadata
  } = getComponentMetadata(component);
  const summary = {
    ...metadata,
    propNames: component.props.map((prop) => prop.name),
    requiredProps: component.props.filter((prop) => prop.required).map((prop) => resolveCustomJsxPropDescriptor(prop)),
    fullDetailsTool: "customWidget_getComponent" as const,
  };
  if (component.package === "@homarr/widgets") {
    return { ...summary, props: component.props.map((prop) => resolveCustomJsxPropDescriptor(prop)) };
  }
  return summary;
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
  const bundled = getBundledAuthoringExample(name);
  if (bundled) {
    return {
      id: name,
      title: bundled.widget.name,
      description: bundled.widget.description ?? `Bundled ${bundled.widget.name} example.`,
      widget: bundled.widget,
    };
  }
  return customJsxExamples.find((example) => example.id === name) ?? null;
}
