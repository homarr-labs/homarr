import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  label: z.string().default(""),
  unit: z.string().default(""),
});

type SingleValueData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<SingleValueData> = {
  type: "singleValue",
  category: "display",
  label: "Single Value",
  schema,
  inputs: [{ id: "value", label: "Value" }],
  outputs: [],
  async execute(data, inputs) {
    return {
      type: "singleValue" as const,
      label: data.label,
      unit: data.unit,
      value: inputs.value,
    };
  },
};

registerNodeType(definition);

export default definition;
