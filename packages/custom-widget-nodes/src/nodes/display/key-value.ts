import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  labels: z.array(z.string()).default([]),
  units: z.array(z.string()).default([]),
});

type KeyValueData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<KeyValueData> = {
  type: "keyValue",
  category: "display",
  label: "Key-Value",
  schema,
  inputs: [{ id: "entries", label: "Entries" }],
  outputs: [],
  async execute(data, inputs) {
    const raw = inputs.entries;
    const entries = Array.isArray(raw) ? raw : [raw];
    return {
      type: "keyValue" as const,
      entries: entries.map((value, i) => ({
        label: data.labels[i] ?? `Value ${i + 1}`,
        unit: data.units[i] ?? "",
        value,
      })),
    };
  },
};

registerNodeType(definition);

export default definition;
