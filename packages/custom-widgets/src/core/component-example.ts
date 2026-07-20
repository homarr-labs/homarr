import type {
  CustomJsxAuthoringCatalog,
  CustomJsxCatalogBindingType,
  CustomJsxComponentApi,
  CustomJsxPropDescriptor,
} from "./component-catalog-types";

export function buildCustomJsxComponentUsageExample(
  component: CustomJsxComponentApi,
  catalog: Pick<CustomJsxAuthoringCatalog, "types">,
) {
  if (component.name === "RecursiveList") {
    return `<RecursiveList data={data.tree} childrenPath="children" keyPath="id" showLines>
  {(node, meta) => (
    <Group gap="xs">
      <Text>{node.label}</Text>
      {meta.hasChildren && <Badge>{meta.childCount}</Badge>}
    </Group>
  )}
</RecursiveList>`;
  }

  const props = component.props
    .filter((prop) => prop.required)
    .slice(0, 4)
    .map((prop) => `${prop.name}=${examplePropValue(prop, catalog.types[prop.typeRef] ?? "unknown")}`);
  if (component.bind) {
    props.unshift(
      `bind="value"`,
      `${component.bind.initialProp}=${bindingInitialValue(component.bind.type, component.bind.initialProp)}`,
    );
  }
  const propText = props.length > 0 ? ` ${props.join(" ")}` : "";
  return `<${component.name}${propText} />`;
}

function bindingInitialValue(type: CustomJsxCatalogBindingType, initialProp: "defaultValue" | "defaultChecked") {
  if (initialProp === "defaultChecked") return "{false}";
  if (type === "string") return '""';
  if (type === "number") return "{0}";
  if (type === "boolean") return "{false}";
  return "{[]}";
}

function examplePropValue(prop: CustomJsxPropDescriptor, type: string) {
  const literal = prop.literalValues?.[0];
  if (literal !== undefined) return `{${formatLiteral(literal)}}`;
  if (type.includes("string")) return `"${prop.name}"`;
  if (type.includes("boolean")) return "{true}";
  if (type.includes("number")) return "{0}";
  if (type.includes("[]") || type.includes("Array<")) return "{[]}";
  return `{options.${prop.name}}`;
}

function formatLiteral(value: string | number | boolean | null) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
