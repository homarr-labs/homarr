import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  xKey: z.string().default("x"),
  yKeys: z.array(z.string()).default(["y"]),
  height: z.number().default(300),
  curveType: z.enum(["linear", "monotone", "step"]).default("monotone"),
});

type AreaChartData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<AreaChartData> = {
  type: "areaChart",
  category: "display",
  label: "Area Chart",
  schema,
  inputs: [{ id: "series", label: "Series Data" }],
  outputs: [],
  async execute(data, inputs) {
    const raw = inputs.series;
    const series = Array.isArray(raw) ? raw : [raw];
    return {
      type: "areaChart" as const,
      data: series,
      xKey: data.xKey,
      series: data.yKeys.map((key) => ({ name: key, color: undefined })),
      height: data.height,
      curveType: data.curveType,
    };
  },
};

registerNodeType(definition);

export default definition;
