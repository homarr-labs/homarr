import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  template: z.string().default("{0}"),
});

type TemplateData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<TemplateData> = {
  type: "template",
  category: "transform",
  label: "Template",
  schema,
  inputs: [{ id: "values", label: "Values" }],
  outputs: [{ id: "text", label: "Text" }],
  async execute(data, inputs) {
    const values = inputs.values;
    const arr = Array.isArray(values) ? values : [values];
    return arr.reduce<string>(
      (result, val, i) => result.replace(new RegExp(`\\{${i}\\}`, "g"), String(val ?? "")),
      data.template,
    );
  },
};

registerNodeType(definition);

export default definition;
