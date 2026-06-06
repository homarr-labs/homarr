import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  xKey: z.string().default("x"),
  yKeys: z.array(z.string()).default(["y"]),
  height: z.number().default(300),
  orientation: z.enum(["horizontal", "vertical"]).default("vertical"),
});

type BarChartData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<BarChartData> = {
  type: "barChart",
  category: "display",
  label: "Bar Chart",
  schema,
  inputs: [{ id: "series", label: "Series Data" }],
  outputs: [],
  async execute(data, inputs) {
    const raw = inputs.series;
    const series = Array.isArray(raw) ? raw : [raw];
    return {
      type: "barChart" as const,
      data: series,
      xKey: data.xKey,
      series: data.yKeys.map((key) => ({ name: key, color: undefined })),
      height: data.height,
      orientation: data.orientation,
    };
  },
};

registerNodeType(definition);

export default definition;
