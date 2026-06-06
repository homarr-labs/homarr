import { JSONPath } from "jsonpath-plus";
import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  expression: z.string().min(1).default("$"),
  wrap: z.boolean().default(false),
});

type JsonPathData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<JsonPathData> = {
  type: "jsonPath",
  category: "transform",
  label: "JSONPath Extract",
  schema,
  inputs: [{ id: "json", label: "JSON Input" }],
  outputs: [{ id: "value", label: "Extracted Value" }],
  async execute(data, inputs) {
    const json = inputs.json;
    return JSONPath({ path: data.expression, json: json as object, wrap: data.wrap });
  },
};

registerNodeType(definition);

export default definition;
