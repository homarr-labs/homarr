import type {
  CustomJsxAuthoringCatalog,
  CustomJsxCatalogBindingType,
  CustomJsxComponentApi,
  CustomJsxPropDescriptor,
} from "./component-catalog-types";

const categoryChartExample = {
  h: 240,
  data: [
    { period: "Mon", value: 12 },
    { period: "Tue", value: 18 },
    { period: "Wed", value: 15 },
  ],
  dataKey: "period",
  series: [{ name: "value", color: "blue.6" }],
};

const segmentChartData = [
  { name: "Active", value: 65, color: "blue.6" },
  { name: "Idle", value: 35, color: "teal.6" },
];

const chartExamples: Record<string, Record<string, unknown>> = {
  AreaChart: categoryChartExample,
  BarChart: categoryChartExample,
  BarsList: { data: segmentChartData },
  BubbleChart: {
    h: 240,
    data: [
      { x: 10, y: 20, z: 30 },
      { x: 20, y: 15, z: 50 },
    ],
    dataKey: { x: "x", y: "y", z: "z" },
    range: [60, 200],
  },
  BulletChart: {
    value: 65,
    target: 80,
    ranges: [
      { value: 50, color: "gray.3" },
      { value: 100, color: "blue.3" },
    ],
  },
  CandlestickChart: {
    h: 240,
    data: [
      { date: "Mon", open: 12, high: 18, low: 10, close: 16 },
      { date: "Tue", open: 16, high: 20, low: 13, close: 14 },
    ],
    dataKey: "date",
  },
  CompositeChart: {
    ...categoryChartExample,
    series: [{ name: "value", color: "blue.6", type: "bar" }],
  },
  DonutChart: { size: 240, data: segmentChartData },
  FunnelChart: { size: 240, data: segmentChartData },
  GaugeChart: { size: 240, value: 65 },
  Heatmap: {
    data: { "2026-01-05": 2, "2026-01-06": 8, "2026-01-07": 5 },
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  },
  LineChart: categoryChartExample,
  MatrixChart: {
    data: [
      { x: "Mon", y: "API", value: 12 },
      { x: "Tue", y: "API", value: 18 },
    ],
    withXLabels: true,
    withYLabels: true,
  },
  PieChart: { size: 240, data: segmentChartData },
  RadarChart: categoryChartExample,
  RadialBarChart: { h: 240, data: segmentChartData, dataKey: "value" },
  SankeyChart: {
    height: 240,
    data: { nodes: [{ name: "Incoming" }, { name: "Complete" }], links: [{ source: 0, target: 1, value: 65 }] },
  },
  ScatterChart: {
    h: 240,
    data: [
      {
        name: "Requests",
        color: "blue.6",
        data: [
          { x: 10, y: 20 },
          { x: 20, y: 15 },
        ],
      },
    ],
    dataKey: { x: "x", y: "y" },
  },
  Sparkline: { h: 80, data: [12, 18, 15, 22, 19] },
  SunburstChart: {
    size: 240,
    data: [{ name: "Services", children: segmentChartData }],
  },
  Treemap: { height: 240, data: segmentChartData },
  WaffleChart: { size: 240, data: segmentChartData },
};

export function buildCustomJsxComponentUsageExample(
  component: CustomJsxComponentApi,
  catalog: Pick<CustomJsxAuthoringCatalog, "types">,
) {
  let exampleProps: Record<string, unknown> = {};
  if (component.package === "@mantine/charts") exampleProps = chartExamples[component.name] ?? {};
  const props = component.props
    .filter((prop) => prop.required && !Object.hasOwn(exampleProps, prop.name))
    .slice(0, 4)
    .map((prop) => `${prop.name}=${examplePropValue(prop, catalog.types[prop.typeRef] ?? "unknown")}`);
  props.push(
    ...Object.entries(exampleProps).map(([name, value]) => {
      if (typeof value === "string") return `${name}=${JSON.stringify(value)}`;
      return `${name}={${JSON.stringify(value)}}`;
    }),
  );
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
  const alternatives = typeAlternatives(type);
  if (alternatives.some((value) => value.endsWith("[]") || /^(?:Readonly)?Array</u.test(value))) return "{[]}";
  if (alternatives.some((value) => /^Record<(?:string|number),/u.test(value))) return "{{}}";
  if (alternatives.includes("string")) return JSON.stringify(prop.name);
  if (alternatives.includes("boolean")) return "{true}";
  if (alternatives.includes("number")) return "{0}";
  return `{options.${prop.name}}`;
}

function typeAlternatives(type: string) {
  const alternatives: string[] = [];
  let depth = 0;
  let start = 0;
  let quote = "";
  for (let index = 0; index < type.length; index += 1) {
    const character = type[index] ?? "";
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if ("([{<".includes(character)) depth += 1;
    else if (">)]}".includes(character)) depth = Math.max(0, depth - 1);
    else if (character === "|" && depth === 0) {
      alternatives.push(type.slice(start, index).trim());
      start = index + 1;
    }
  }
  alternatives.push(type.slice(start).trim());
  return alternatives;
}

function formatLiteral(value: string | number | boolean | null) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
