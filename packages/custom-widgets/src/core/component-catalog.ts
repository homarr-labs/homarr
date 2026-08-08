import catalog from "./component-catalog.generated.json";
import type { CustomJsxAuthoringCatalog, CustomJsxPropDescriptor } from "./component-catalog-types";

export type * from "./component-catalog-types";

export const customJsxAuthoringCatalog = catalog as unknown as Readonly<CustomJsxAuthoringCatalog>;
export const customJsxCatalogComponentByName = new Map(
  customJsxAuthoringCatalog.components.map((component) => [component.name, component]),
);
export const customJsxCatalogGlobalPropByName = new Map(
  customJsxAuthoringCatalog.globalProps.map((prop) => [prop.name, prop]),
);

export interface ResolvedCustomJsxPropDescriptor extends Omit<CustomJsxPropDescriptor, "typeRef"> {
  type: string;
}

export function getCustomJsxPropType(
  prop: Pick<CustomJsxPropDescriptor, "typeRef">,
  catalogValue: Readonly<CustomJsxAuthoringCatalog> = customJsxAuthoringCatalog,
): string {
  return catalogValue.types[prop.typeRef] ?? "unknown";
}

export function resolveCustomJsxPropDescriptor(
  prop: CustomJsxPropDescriptor,
  catalogValue: Readonly<CustomJsxAuthoringCatalog> = customJsxAuthoringCatalog,
): ResolvedCustomJsxPropDescriptor {
  const { typeRef, ...metadata } = prop;
  return { ...metadata, type: catalogValue.types[typeRef] ?? "unknown" };
}

export function getCustomJsxComponentProps(name: string): ResolvedCustomJsxPropDescriptor[] {
  const component = customJsxCatalogComponentByName.get(name);
  if (!component || component.safety === "denied") return [];
  const blockedProps = new Set(component.blockedProps.map(({ name: propName }) => propName));
  const props = new Map(
    customJsxAuthoringCatalog.globalProps
      .filter((prop) => !blockedProps.has(prop.name))
      .map((prop) => [prop.name, resolveCustomJsxPropDescriptor(prop)]),
  );
  for (const prop of component.props) props.set(prop.name, resolveCustomJsxPropDescriptor(prop));
  if (component.bind) {
    props.set("bind", {
      name: "bind",
      type: "string",
      required: false,
      source: "component",
      description: `Temporary in-memory ${component.bind.type} input binding initialized by ${component.bind.initialProp}.`,
    });
  }
  return [...props.values()];
}
