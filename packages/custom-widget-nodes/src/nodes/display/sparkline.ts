import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  height: z.number().default(60),
  color: z.string().default("blue"),
});

type SparklineData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<SparklineData> = {
  type: "sparkline",
  category: "display",
  label: "Sparkline",
  schema,
  inputs: [{ id: "values", label: "Values" }],
  outputs: [],
  async execute(data, inputs) {
    const raw = inputs.values;
    const values = Array.isArray(raw) ? raw.map(Number) : [Number(raw)];
    return {
      type: "sparkline" as const,
      data: values,
      height: data.height,
      color: data.color,
    };
  },
};

registerNodeType(definition);

export default definition;
