# Custom Widget Builder — Theoretical Implementation Design

This document describes the full theoretical implementation of the **Custom Widget Builder**, a visual node-graph editor that allows Homarr users to compose data pipelines from API sources through transformations to display outputs — all within a drag-and-drop React Flow canvas.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [React Flow Integration](#react-flow-integration)
3. [Node Type System](#node-type-system)
4. [Edge & Connection Model](#edge--connection-model)
5. [Server-Side Execution Engine](#server-side-execution-engine)
6. [Node Categories & Registry](#node-categories--registry)
7. [Editor UI Components](#editor-ui-components)
8. [State Management](#state-management)
9. [Serialization & Persistence](#serialization--persistence)
10. [Performance Considerations](#performance-considerations)
11. [Migration Strategy](#migration-strategy)
12. [Security Model](#security-model)
13. [Testing Strategy](#testing-strategy)
14. [Future Extensions](#future-extensions)

---

## Architecture Overview

The Custom Widget Builder follows a **split execution model**:

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Editor)                  │
│                                                     │
│  ┌───────────┐    ┌──────────┐    ┌──────────────┐  │
│  │  React    │    │  Config  │    │   Preview    │  │
│  │  Flow     │◄──►│  Panel   │    │   Panel      │  │
│  │  Canvas   │    │ (Drawer) │    │ (Live Data)  │  │
│  └─────┬─────┘    └──────────┘    └──────┬───────┘  │
│        │                                 │          │
│        │  serialize ┌────────┐  tRPC     │          │
│        └───────────►│ Graph  │───────────┘          │
│                     │ JSON   │                      │
└─────────────────────┤        ├──────────────────────┘
                      └───┬────┘
                          │ POST (tRPC mutation)
┌─────────────────────────▼───────────────────────────┐
│                   Server (Executor)                  │
│                                                     │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐  │
│  │Topological│   │  Node     │    │   Result     │  │
│  │  Sort    │──►│  Runner   │──►│   Aggregator │  │
│  └──────────┘    └───────────┘    └──────────────┘  │
│                                                     │
│  Source nodes execute in parallel (Promise.all)      │
│  Transform/Display nodes execute in dependency order │
└─────────────────────────────────────────────────────┘
```

The editor runs entirely client-side as a React component. The graph definition (nodes + edges + per-node config) is serialized as JSON and stored in the database. At widget render time, the server deserializes the graph, executes nodes in topological order, and returns the aggregated display outputs.

---

## React Flow Integration

### Package: `@xyflow/react` (v12+)

React Flow is the foundation of the visual editor. It provides:

- **Canvas** with pan, zoom, and minimap
- **Nodes** as arbitrary React components placed at (x, y) positions
- **Edges** as SVG paths connecting node handles
- **Handles** as typed connection points (source/target)

### Core Setup Pattern

The recommended pattern from the React Flow docs defines `nodeTypes` and `edgeTypes` **outside** the component (or with `useMemo`) to prevent re-creation on every render:

```tsx
import { ReactFlow, useNodesState, useEdgesState, addEdge, type Node, type Edge, type OnConnect } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// MUST be defined outside component or memoized to prevent
// React Flow from recreating internal wrapper components.
const nodeTypes = {
  httpRequest: HttpRequestNode,
  jsonPath: JsonPathNode,
  merge: MergeNode,
  template: TemplateNode,
  singleValue: SingleValueNode,
  keyValue: KeyValueNode,
  table: TableNode,
  lineChart: LineChartNode,
  areaChart: AreaChartNode,
  barChart: BarChartNode,
  sparkline: SparklineNode,
};

function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    />
  );
}
```

### Key React Flow Hooks

| Hook                                         | Purpose                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `useNodesState(initial)`                     | Returns `[nodes, setNodes, onNodesChange]` — manages node array state                           |
| `useEdgesState(initial)`                     | Returns `[edges, setEdges, onEdgesChange]` — manages edge array state                           |
| `useReactFlow()`                             | Imperative API: `getNodes()`, `getEdges()`, `setNodes()`, `fitView()`, `screenToFlowPosition()` |
| `useHandleConnections({ type, nodeId, id })` | Returns connections for a specific handle                                                       |

### Handle Component

Each custom node component renders `<Handle>` components to define connection points:

```tsx
import { Handle, Position, type NodeProps } from "@xyflow/react";

function HttpRequestNode({ data }: NodeProps) {
  return (
    <div className="custom-node source-node">
      <div className="node-header">HTTP Request</div>
      <div className="node-body">{data.label}</div>
      <Handle type="source" position={Position.Bottom} id="response" />
    </div>
  );
}
```

Handle properties:

- `type`: `"source"` (output) or `"target"` (input)
- `position`: `Position.Top | Right | Bottom | Left`
- `id`: unique identifier within the node (enables multiple handles per node)

### Connection Validation

Use `isValidConnection` on the `<ReactFlow>` component to prevent invalid wiring:

```tsx
const isValidConnection = (connection: Connection) => {
  const sourceNode = getNode(connection.source);
  const targetNode = getNode(connection.target);
  if (!sourceNode || !targetNode) return false;

  const sourceType = getNodeType(sourceNode.type);
  const targetType = getNodeType(targetNode.type);
  if (!sourceType || !targetType) return false;

  // Prevent display → anything connections
  if (sourceType.category === "display") return false;
  // Prevent anything → source connections
  if (targetType.category === "source") return false;
  // Prevent self-connections
  if (connection.source === connection.target) return false;

  return true;
};
```

---

## Node Type System

### `NodeTypeDefinition` Interface

Every node type is described by a definition object that drives both editor UI and server execution:

```typescript
interface HandleDefinition {
  id: string;
  label: string;
}

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "segmented" | "number" | "select" | "color";
  options?: string[];
  defaultValue?: string;
}

type NodeCategory = "source" | "transform" | "display";

interface NodeTypeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  icon: TablerIcon;
  color: string;
  schema: z.ZodObject<any>;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configFields: ConfigField[];

  execute: (
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    context: ExecutionContext,
  ) => Promise<unknown>;
}
```

### Category Semantics

| Category      | Inputs                  | Outputs         | Execution                                          |
| ------------- | ----------------------- | --------------- | -------------------------------------------------- |
| **source**    | None (data originators) | 1+ outputs      | Parallel execution, first in topological order     |
| **transform** | 1+ inputs               | 1+ outputs      | Sequential after dependencies resolve              |
| **display**   | 1+ inputs               | None (terminal) | Sequential, results collected for widget rendering |

### Registration Pattern

Node types self-register via a global registry at import time:

```typescript
const registry = new Map<string, NodeTypeDefinition>();

export function registerNodeType(def: NodeTypeDefinition) {
  registry.set(def.type, def);
}

export function getNodeType(type: string) {
  return registry.get(type);
}

export function getAllNodeTypes() {
  return Array.from(registry.values());
}

export function getNodeTypesByCategory(category: NodeCategory) {
  return getAllNodeTypes().filter((t) => t.category === category);
}
```

The package's `index.ts` imports all node definition files, triggering their `registerNodeType()` calls:

```typescript
import "./nodes/source/http-request";
import "./nodes/transform/json-path";
import "./nodes/transform/merge";
import "./nodes/transform/template";
import "./nodes/display/single-value";
import "./nodes/display/key-value";
import "./nodes/display/table-display";
import "./nodes/display/line-chart";
import "./nodes/display/area-chart";
import "./nodes/display/bar-chart";
import "./nodes/display/sparkline";
```

---

## Edge & Connection Model

### Edge Structure

```typescript
interface FlowEdge {
  id: string;
  source: string; // source node ID
  target: string; // target node ID
  sourceHandle?: string; // handle ID on source (e.g. "response")
  targetHandle?: string; // handle ID on target (e.g. "json")
}
```

### Edge Types

React Flow supports custom edge components. For the builder, three edge types are planned:

1. **Default** — simple Bezier curve, sufficient for most connections
2. **Animated** — dashed animation indicating data flow during preview
3. **Error** — red highlight when a connection has a runtime error

```tsx
const edgeTypes = {
  default: DefaultEdge,
  animated: AnimatedEdge,
  error: ErrorEdge,
};
```

### Connection Rules

Connections follow strict rules enforced by `isValidConnection`:

- **Source → Transform**: Always valid (data flows from API to processing)
- **Source → Display**: Valid (direct API data to display)
- **Transform → Transform**: Valid (chaining transformations)
- **Transform → Display**: Valid (processed data to display)
- **Display → anything**: Invalid (display nodes are terminal)
- **anything → Source**: Invalid (source nodes have no inputs)
- **Self-loops**: Invalid
- **Type compatibility**: Future enhancement — validate that output types match expected input types

---

## Server-Side Execution Engine

### Topological Sort

The executor resolves node dependencies using Kahn's algorithm:

```typescript
function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const sorted: FlowNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(nodeMap.get(id)!);
    for (const neighbor of adjacency.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}
```

### Parallel Source Execution

Source nodes (no incoming edges) are independent and can execute concurrently:

```typescript
async function executeFlowGraph(graph: FlowGraph, context: ExecutionContext): Promise<Record<string, unknown>> {
  const sorted = topologicalSort(graph.nodes, graph.edges);
  const results = new Map<string, unknown>();
  const displayOutputs: Record<string, unknown> = {};

  // Phase 1: execute all source nodes in parallel
  const sourceNodes = sorted.filter((n) => {
    const def = getNodeType(n.type);
    return def?.category === "source";
  });

  await Promise.all(
    sourceNodes.map(async (node) => {
      const def = getNodeType(node.type)!;
      const result = await def.execute(node.data, {}, context);
      results.set(node.id, result);
    }),
  );

  // Phase 2: execute remaining nodes in topological order
  for (const node of sorted) {
    if (results.has(node.id)) continue;
    const def = getNodeType(node.type);
    if (!def) continue;

    const inputs = buildInputs(node.id, graph.edges, results);
    const result = await def.execute(node.data, inputs, context);
    results.set(node.id, result);

    if (def.category === "display") {
      displayOutputs[node.id] = result;
    }
  }

  return displayOutputs;
}
```

### Input Resolution

For each node, incoming edges determine which results to feed as inputs:

```typescript
function buildInputs(nodeId: string, edges: FlowEdge[], results: Map<string, unknown>): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  const incoming = edges.filter((e) => e.target === nodeId);

  for (const edge of incoming) {
    const handleId = edge.targetHandle ?? "default";
    inputs[handleId] = results.get(edge.source);
  }

  return inputs;
}
```

### Execution Context

The execution context provides access to credentials and environment:

```typescript
interface ExecutionContext {
  secrets: Record<string, string>;
  baseUrl: string;
  timeout?: number;
}
```

Secrets are decrypted from the database at execution time and injected into the context. They are never sent to the client.

---

## Node Categories & Registry

### Source Nodes

| Node Type        | Description                        | Config Fields                                    | Outputs                  |
| ---------------- | ---------------------------------- | ------------------------------------------------ | ------------------------ |
| `httpRequest`    | Fetches data from an HTTP endpoint | url, method, headers, body, authType, headerName | `response` (parsed JSON) |
| `graphqlRequest` | Executes a GraphQL query           | url, query, variables, authType                  | `data` (response.data)   |
| `staticValue`    | Provides a constant JSON value     | json (textarea)                                  | `value`                  |
| `cronCache`      | Reads from a Homarr cron cache key | cacheKey                                         | `value`                  |

### Transform Nodes

| Node Type      | Description                                      | Config Fields                       | Inputs → Outputs        |
| -------------- | ------------------------------------------------ | ----------------------------------- | ----------------------- |
| `jsonPath`     | Extracts values using JSONPath expressions       | expression, wrap (boolean)          | `json` → `value`        |
| `merge`        | Combines multiple inputs into an object or array | mode (object/array), keys           | `input_0..N` → `merged` |
| `template`     | String interpolation with `{{variable}}` syntax  | template (textarea)                 | `variables` → `text`    |
| `mathOp`       | Arithmetic on numeric inputs                     | operation (+, -, \*, /, %)          | `a`, `b` → `result`     |
| `arrayMap`     | Applies a sub-expression to each array element   | expression                          | `array` → `mapped`      |
| `filter`       | Filters array elements by condition              | condition (JSONPath predicate)      | `array` → `filtered`    |
| `dateFormat`   | Formats timestamps                               | inputFormat, outputFormat, timezone | `date` → `formatted`    |
| `numberFormat` | Formats numbers (locale, decimals, currency)     | locale, decimals, style, currency   | `number` → `formatted`  |
| `conditional`  | If/else branching based on a condition           | condition, operator, compareValue   | `value` → `result`      |

### Display Nodes

| Node Type         | Description                                 | Config Fields                         | Inputs    |
| ----------------- | ------------------------------------------- | ------------------------------------- | --------- |
| `singleValue`     | Large centered text display                 | label, unit, prefix, suffix           | `value`   |
| `keyValue`        | Label-value pairs                           | (dynamic entries via connected merge) | `entries` |
| `table`           | Tabular data display                        | columns config                        | `rows`    |
| `lineChart`       | Multi-series line chart (`@mantine/charts`) | xKey, height, curveType, series       | `data`    |
| `areaChart`       | Multi-series area chart                     | xKey, height, curveType, series       | `data`    |
| `barChart`        | Multi-series bar chart                      | xKey, height, orientation             | `data`    |
| `sparkline`       | Compact inline sparkline                    | height, color                         | `data`    |
| `progressBar`     | Progress indicator                          | min, max, color, label                | `value`   |
| `statusIndicator` | Colored dot with label (up/down/warning)    | thresholds                            | `value`   |
| `markdown`        | Renders Markdown content                    | (none)                                | `content` |

---

## Editor UI Components

### 1. Flow Canvas

The main `<ReactFlow>` canvas wrapped in a full-height container:

```tsx
<ReactFlowProvider>
  <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      isValidConnection={isValidConnection}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
    >
      <Background variant="dots" gap={16} size={1} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  </div>
</ReactFlowProvider>
```

### 2. Context Menu (Add Node)

Right-clicking on the canvas opens a categorized menu built with Mantine components:

```
┌──────────────────────┐
│ ▸ Sources            │
│   • HTTP Request     │
│   • GraphQL Request  │
│   • Static Value     │
│ ▸ Transforms         │
│   • JSONPath Extract │
│   • Merge            │
│   • Template         │
│   • Math Operation   │
│ ▸ Display            │
│   • Single Value     │
│   • Key-Value        │
│   • Table            │
│   • Line Chart       │
│   • Area Chart       │
│   • Bar Chart        │
│   • Sparkline        │
└──────────────────────┘
```

The menu is dynamically built from the node registry:

```tsx
function ContextMenu({ position, onAddNode, onClose }) {
  const categories = ["source", "transform", "display"] as const;

  return (
    <Paper shadow="md" p="xs" style={{ position: "absolute", ...position }}>
      {categories.map((cat) => (
        <div key={cat}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            {cat}s
          </Text>
          {getNodeTypesByCategory(cat).map((def) => (
            <UnstyledButton key={def.type} onClick={() => onAddNode(def.type, position)}>
              <Group gap="xs">
                <def.icon size={16} />
                <Text size="sm">{def.label}</Text>
              </Group>
            </UnstyledButton>
          ))}
        </div>
      ))}
    </Paper>
  );
}
```

### 3. Config Panel (Drawer)

Clicking a node opens a right-side `<Drawer>` with config fields generated from `configFields`:

```tsx
function ConfigPanel({ node, onUpdate, onDelete, onClose }) {
  const def = getNodeType(node.type);
  if (!def) return null;

  return (
    <Drawer opened onClose={onClose} title={`Configure: ${def.label}`} position="right">
      <Stack gap="sm">
        {def.configFields.map((field) => {
          const renderers: Record<string, () => ReactNode> = {
            text: () => (
              <TextInput
                label={field.label}
                value={String(node.data[field.key] ?? field.defaultValue ?? "")}
                onChange={(e) => onUpdate(node.id, { ...node.data, [field.key]: e.target.value })}
              />
            ),
            textarea: () => (
              <Textarea
                label={field.label}
                value={String(node.data[field.key] ?? "")}
                onChange={(e) => onUpdate(node.id, { ...node.data, [field.key]: e.target.value })}
                minRows={3}
              />
            ),
            segmented: () => (
              <SegmentedControl
                data={field.options ?? []}
                value={String(node.data[field.key] ?? field.options?.[0] ?? "")}
                onChange={(v) => onUpdate(node.id, { ...node.data, [field.key]: v })}
                fullWidth
              />
            ),
            number: () => (
              <NumberInput
                label={field.label}
                value={Number(node.data[field.key] ?? 0)}
                onChange={(v) => onUpdate(node.id, { ...node.data, [field.key]: v })}
              />
            ),
            color: () => (
              <ColorInput
                label={field.label}
                value={String(node.data[field.key] ?? "")}
                onChange={(v) => onUpdate(node.id, { ...node.data, [field.key]: v })}
              />
            ),
          };

          const render = renderers[field.type] ?? renderers.text!;
          return render!();
        })}
      </Stack>
    </Drawer>
  );
}
```

### 4. Preview Panel

A live preview panel that shows the widget output by executing the current graph server-side:

```tsx
function PreviewPanel({ graph, definitionId }) {
  const { data, isLoading, error, refetch } = clientApi.customApi.getData.useQuery(
    { definitionId },
    { enabled: !!definitionId },
  );

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Preview</Text>
        <ActionIcon onClick={() => refetch()} variant="subtle">
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>
      {isLoading && (
        <Center>
          <Loader />
        </Center>
      )}
      {error && <Text c="red">{error.message}</Text>}
      {data && <WidgetDataRenderer data={data} />}
    </Paper>
  );
}
```

### 5. Toolbar

A toolbar strip above the canvas for graph-level actions:

- **Save** — serialize and persist the graph
- **Preview** — trigger server-side execution and show results
- **Auto-layout** — use dagre/ELK to automatically arrange nodes
- **Export/Import** — download/upload graph JSON
- **Undo/Redo** — using a history stack of graph snapshots

---

## State Management

### Client-Side State

The editor uses React Flow's built-in state hooks (`useNodesState`, `useEdgesState`) for canvas state. Additional state is managed via React `useState`:

```typescript
// Canvas state (managed by React Flow)
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

// Editor state (local)
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
const [isDirty, setIsDirty] = useState(false);
```

### Why Not Jotai/Zustand?

React Flow already manages its own internal store. Adding Jotai atoms for the same data creates synchronization complexity. The recommended approach is:

1. Use React Flow hooks for canvas state
2. Use React state for UI-only state (selected node, drawer open)
3. Use tRPC mutations for persistence
4. Use `useReactFlow()` for imperative operations

### Dirty State Tracking

Track unsaved changes to warn users before navigating away:

```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) e.preventDefault();
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [isDirty]);
```

---

## Serialization & Persistence

### Graph Schema

The flow graph is stored as a JSON string in the `flowGraph` column of `custom_widget_definition`:

```typescript
const flowGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
    }),
  ),
});
```

### Save Flow

Serialize the current canvas state and persist via tRPC:

```typescript
const saveGraph = useCallback(async () => {
  const graph: FlowGraph = { nodes, edges };
  await updateMutation.mutateAsync({
    id: definitionId,
    flowGraph: JSON.stringify(graph),
  });
  setIsDirty(false);
}, [nodes, edges, definitionId]);
```

### Load Flow

When opening the editor, parse the stored JSON and initialize React Flow:

```typescript
const { data: definition } = clientApi.customWidget.byId.useQuery({ id });

useEffect(() => {
  if (definition?.flowGraph) {
    const graph = JSON.parse(definition.flowGraph) as FlowGraph;
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }
}, [definition]);
```

---

## Performance Considerations

### React Flow Performance Guidelines

From the React Flow documentation:

1. **Define `nodeTypes` and `edgeTypes` outside components** — or memoize with `useMemo`. React Flow wraps each type internally; passing new objects triggers full re-renders.

2. **Memoize callbacks** — use `useCallback` for `onConnect`, `onNodeClick`, and other event handlers.

3. **Memoize constant props** — use `useMemo` for `snapGrid`, `defaultEdgeOptions`, and similar constant objects.

4. **Node count limits** — React Flow renders DOM elements for each node (unlike canvas-based libraries). Practical limits:
   - < 100 nodes: smooth performance
   - 100–500 nodes: consider virtualization
   - 500+ nodes: not recommended for React Flow

5. **Custom node complexity** — keep custom node components lightweight. Avoid expensive renders inside node bodies. Use `React.memo()` for custom node components.

6. **Edge rendering** — edges are SVG paths. Large numbers of edges (1000+) can impact rendering. Consider hiding edges during drag operations.

### Graph-Specific Optimizations

For the Custom Widget Builder specifically:

- **Typical graph size**: 3–20 nodes (well within React Flow's comfortable range)
- **Execution caching**: Cache execution results server-side with a short TTL to avoid re-fetching on every widget render
- **Debounced saves**: Debounce graph persistence to avoid excessive mutations during rapid editing
- **Lazy node registration**: Only import node type definitions used by the current graph

---

## Migration Strategy

### From Flat Definitions to Flow Graphs

Existing flat custom widget definitions (baseUrl + endpoint + displayConfig) can be automatically migrated to the equivalent flow graph:

```
Flat Definition                          Flow Graph
┌─────────────────┐                     ┌──────────────────┐
│ baseUrl          │                     │ HTTP Request     │
│ endpoint         │ ──────────────►    │ (source node)    │
│ method           │                     │ url = baseUrl +  │
│ authType         │                     │       endpoint   │
│ requestBody      │                     └────────┬─────────┘
└─────────────────┘                              │
                                                 ▼
┌─────────────────┐                     ┌──────────────────┐
│ displayConfig    │                     │ JSONPath Extract │
│   jsonPath       │ ──────────────►    │ (transform node) │
│   label          │                     │ expression =     │
│   unit           │                     │   jsonPath       │
│   mappings       │                     └────────┬─────────┘
│   columns        │                              │
└─────────────────┘                              ▼
                                        ┌──────────────────┐
                                        │ Single Value /   │
                                        │ Key-Value / Table│
                                        │ (display node)   │
                                        └──────────────────┘
```

### Migration Function

```typescript
function flatDefinitionToFlowGraph(def: FlatDefinition): FlowGraph {
  const httpNodeId = createId();
  const jsonPathNodeId = createId();
  const displayNodeId = createId();

  const httpNode: FlowNode = {
    id: httpNodeId,
    type: "httpRequest",
    position: { x: 250, y: 50 },
    data: {
      label: "HTTP Request",
      url: `${def.baseUrl}${def.endpoint}`,
      method: def.method,
      authType: def.authType,
    },
  };

  const parsedConfig = JSON.parse(def.displayConfig);
  const jsonPathExpression = parsedConfig.jsonPath ?? "$";

  const jsonPathNode: FlowNode = {
    id: jsonPathNodeId,
    type: "jsonPath",
    position: { x: 250, y: 200 },
    data: {
      label: "JSONPath Extract",
      expression: jsonPathExpression,
    },
  };

  const displayNode = buildDisplayNode(displayNodeId, def.displayType, parsedConfig);

  return {
    nodes: [httpNode, jsonPathNode, displayNode],
    edges: [
      { id: createId(), source: httpNodeId, target: jsonPathNodeId, sourceHandle: "response", targetHandle: "json" },
      { id: createId(), source: jsonPathNodeId, target: displayNodeId, sourceHandle: "value", targetHandle: "value" },
    ],
  };
}
```

### Migration Procedures (tRPC)

```typescript
// Migrate a single definition
migrateToFlow: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const def = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    const flowGraph = flatDefinitionToFlowGraph(def);
    await ctx.db.update(customWidgetDefinitions)
      .set({ flowGraph: JSON.stringify(flowGraph) })
      .where(eq(customWidgetDefinitions.id, input.id));
  }),

// Migrate all definitions that don't have a flow graph
migrateAll: protectedProcedure.mutation(async ({ ctx }) => {
  const defs = await ctx.db.query.customWidgetDefinitions.findMany({
    where: isNull(customWidgetDefinitions.flowGraph),
  });
  for (const def of defs) {
    const flowGraph = flatDefinitionToFlowGraph(def);
    await ctx.db.update(customWidgetDefinitions)
      .set({ flowGraph: JSON.stringify(flowGraph) })
      .where(eq(customWidgetDefinitions.id, def.id));
  }
  return { migrated: defs.length };
}),
```

---

## Security Model

### SSRF Protection

All HTTP source nodes must validate URLs server-side before execution:

- Only `http://` and `https://` protocols allowed
- No localhost, `127.0.0.1`, `0.0.0.0`, `[::1]`, or private IP ranges
- No DNS rebinding (resolve hostname before connecting)
- Fetch timeout (10 seconds default) via `AbortController`

### Credential Handling

- Credentials are stored as `customWidgetSecrets` with AES-256-CBC encryption
- Secrets are decrypted server-side only at execution time
- The `ExecutionContext.secrets` map is never serialized or sent to the client
- The flow graph JSON contains **no credentials** — only references to secret kinds

### Ownership & Permissions

- Custom widget definitions are owned by their creator
- Edit/delete operations require ownership or admin role (`ensureOwnerOrAdmin`)
- Flow graphs execute within `protectedProcedure` — requires authenticated session

---

## Testing Strategy

### Unit Tests

1. **Node registry**: Verify registration, retrieval, category filtering
2. **Individual node execution**: Test each node type's `execute()` with mocked inputs
3. **Topological sort**: Test with various graph shapes (linear, diamond, parallel, cyclic detection)
4. **Connection validation**: Test all valid/invalid connection combinations
5. **Migration**: Test `flatDefinitionToFlowGraph` for each display type

### Integration Tests

1. **Full graph execution**: Build a graph programmatically and verify end-to-end output
2. **tRPC procedures**: Test CRUD operations with a test database
3. **Secret handling**: Verify secrets are injected correctly and never leak

### E2E Tests (Playwright)

1. **Canvas interaction**: Add nodes via context menu, connect them, configure via panel
2. **Save/load**: Create a graph, navigate away, return and verify persistence
3. **Preview**: Verify that the preview panel shows expected output
4. **Migration**: Create a flat definition, trigger migration, verify the flow editor loads

---

## Future Extensions

### Short-Term (Next Release)

- **Auto-layout**: Integrate dagre or ELK.js for automatic node positioning
- **Undo/Redo**: History stack with snapshot-based undo
- **Node duplication**: Clone a node with its config
- **Group nodes**: Sub-flows for reusable pipelines

### Medium-Term

- **Template library**: Pre-built graph templates ("Stock Price Monitor", "Server Health Dashboard")
- **Conditional display**: Show/hide display nodes based on data conditions
- **Polling interval**: Per-source node refresh rates
- **WebSocket sources**: Live data via tRPC subscriptions
- **Error boundaries**: Per-node error display in the widget

### Long-Term

- **Collaborative editing**: Real-time multi-user editing via CRDT
- **Marketplace**: Share and import community-created graphs
- **AI-assisted wiring**: Suggest connections based on data types
- **Visual debugging**: Step-through execution with intermediate results shown on edges
- **Sub-graphs**: Encapsulate a group of nodes into a reusable component node

### Chart Enhancement Roadmap

Using `@mantine/charts` (built on Recharts):

| Chart Type    | Mantine Component       | Status      |
| ------------- | ----------------------- | ----------- |
| Line Chart    | `<LineChart>`           | Implemented |
| Area Chart    | `<AreaChart>`           | Implemented |
| Bar Chart     | `<BarChart>`            | Implemented |
| Sparkline     | `<Sparkline>`           | Implemented |
| Donut Chart   | `<DonutChart>`          | Planned     |
| Pie Chart     | `<PieChart>`            | Planned     |
| Radar Chart   | `<RadarChart>`          | Planned     |
| Scatter Chart | `<ScatterChart>`        | Planned     |
| Bubble Chart  | Custom (Scatter + size) | Planned     |
| Composite     | `<CompositeChart>`      | Planned     |

Each chart display node exposes chart-specific configuration (series definitions, colors, axis labels, legends, tooltips, reference lines) through the config panel.

---

## Summary

The Custom Widget Builder transforms Homarr's custom widget system from a simple "point at an API" tool into a powerful visual data pipeline editor. The architecture is designed around:

1. **React Flow** for the visual editor canvas (nodes, edges, handles)
2. **Node Type Registry** for extensible, self-registering node definitions
3. **Server-side execution** with topological sort and parallel source execution
4. **Mantine UI** for configuration panels, context menus, and chart rendering
5. **Backward compatibility** via automatic migration from flat definitions

The implementation is structured as a standalone package (`@homarr/custom-widget-nodes`) that can be incrementally developed without disrupting existing functionality.
