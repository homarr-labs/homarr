import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  mode: z.enum(["array", "object"]).default("array"),
  keys: z.array(z.string()).optional(),
});

type MergeData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<MergeData> = {
  type: "merge",
  category: "transform",
  label: "Merge",
  schema,
  inputs: [
    { id: "a", label: "Input A" },
    { id: "b", label: "Input B" },
  ],
  outputs: [{ id: "merged", label: "Merged" }],
  async execute(data, inputs) {
    const { a, b } = inputs;

    if (data.mode === "object") {
      const keys = data.keys ?? ["a", "b"];
      return { [keys[0] ?? "a"]: a, [keys[1] ?? "b"]: b };
    }

    const arrA = Array.isArray(a) ? a : [a];
    const arrB = Array.isArray(b) ? b : [b];
    return [...arrA, ...arrB];
  },
};

registerNodeType(definition);

export default definition;
