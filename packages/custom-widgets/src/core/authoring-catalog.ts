import {
  customJsxAuthoringCatalog,
  customJsxCatalogGlobalPropByName,
  resolveCustomJsxPropDescriptor,
} from "./component-catalog";
import { BUNDLED_CUSTOM_WIDGETS } from "./bundled-widgets";
import { customJsxExamples } from "./examples";
import { customJsxTablerIconNames } from "./tabler-icons";

const pokedexAuthoringExample = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex");

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

export function findCustomWidgetComponents(query: string, limit = 16) {
  const normalizedQuery = normalizeComponentSearchText(query);
  const terms = [...new Set(normalizedQuery.split(" ").filter((term) => term.length > 1))];
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 16);
  const components = customJsxAuthoringCatalog.components
    .map((component) => {
      const normalizedName = normalizeComponentSearchText(component.name);
      const normalizedCategory = normalizeComponentSearchText(component.category ?? "");
      const normalizedDescription = normalizeComponentSearchText(component.description ?? "");
      let score = normalizedName === normalizedQuery ? 1_000 : 0;
      if (` ${normalizedQuery} `.includes(` ${normalizedName} `)) score += 500;
      for (const term of terms) {
        if (normalizedName.split(" ").includes(term)) score += 100;
        else if (normalizedName.includes(term)) score += 60;
        if (normalizedCategory.split(" ").includes(term)) score += 20;
        if (normalizedDescription.split(" ").includes(term)) score += 8;
        else if (normalizedDescription.includes(term)) score += 2;
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
      "Use these compact selected docs and proceed to template validation. Fetch one full component document only for a concrete unresolved prop or repair.",
  };
}

function getCustomWidgetComponentBatchSummary(name: string) {
  const component = getCustomWidgetComponent(name);
  if (!component) return null;
  const {
    schemaVersion: _schemaVersion,
    mantineVersion: _mantineVersion,
    customWidgetVersion: _customWidgetVersion,
    knownValues: _knownValues,
    props,
    ...metadata
  } = component;
  const summary = {
    ...metadata,
    propNames: props.map((prop) => prop.name),
    requiredProps: props.filter((prop) => prop.required),
    fullDetailsTool: "customWidget_getComponent" as const,
  };
  if (component.package === "@homarr/widgets") return { ...summary, props };
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
