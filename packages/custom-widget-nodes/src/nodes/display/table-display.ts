import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const schema = z.object({
  columns: z
    .array(
      z.object({
        header: z.string(),
        accessor: z.string(),
      }),
    )
    .default([]),
});

type TableDisplayData = z.infer<typeof schema>;

const definition: NodeTypeDefinition<TableDisplayData> = {
  type: "table",
  category: "display",
  label: "Table",
  schema,
  inputs: [{ id: "rows", label: "Rows" }],
  outputs: [],
  async execute(data, inputs) {
    const raw = inputs.rows;
    const rows = Array.isArray(raw) ? raw : [raw];
    return {
      type: "table" as const,
      columns: data.columns.map((c) => c.header),
      rows: rows.map((row) =>
        data.columns.map((c) => {
          if (typeof row === "object" && row !== null) {
            return (row as Record<string, unknown>)[c.accessor];
          }
          return row;
        }),
      ),
    };
  },
};

registerNodeType(definition);

export default definition;
