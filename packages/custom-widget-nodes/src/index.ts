export type {
  FlowGraph,
  FlowNode,
  FlowEdge,
  NodeCategory,
  HandleDefinition,
  NodeTypeDefinition,
  ExecutionContext,
} from "./types";
export { registerNodeType, getNodeType, getAllNodeTypes, getNodeTypesByCategory } from "./registry";
export { executeFlowGraph } from "./executor";
export { flatDefinitionToFlowGraph } from "./migration";

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
