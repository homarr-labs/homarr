import { z } from "zod/v4";

const coordinate = z.number().finite().min(-100_000).max(100_000);
export const customWidgetEditorLayoutSchema = z
  .object({
    version: z.literal(1),
    nodes: z
      .record(
        z.string().max(160),
        z.object({
          x: coordinate,
          y: coordinate,
          parentId: z.string().max(160).optional(),
        }),
      )
      .refine((nodes) => Object.keys(nodes).length <= 256),
    groups: z
      .record(
        z.string().max(160),
        z.object({
          title: z.string().max(128),
          width: z.number().min(240).max(10000),
          height: z.number().min(160).max(10000),
        }),
      )
      .refine((groups) => Object.keys(groups).length <= 64)
      .default({}),
  })
  .superRefine((layout, context) => {
    const ids = new Set([...Object.keys(layout.nodes), ...Object.keys(layout.groups)]);
    if (ids.size > 256)
      context.addIssue({ code: "custom", path: ["nodes"], message: "Editor layout supports at most 256 nodes" });
    for (const [id, node] of Object.entries(layout.nodes)) {
      if (!node.parentId) continue;
      const path = ["nodes", id, "parentId"];
      if (!Object.hasOwn(layout.groups, node.parentId)) {
        context.addIssue({ code: "custom", path, message: "Parent group does not exist" });
        continue;
      }
      const visited = new Set([id]);
      let parent: string | undefined = node.parentId;
      while (parent) {
        if (visited.has(parent)) {
          context.addIssue({
            code: "custom",
            path,
            message: "Editor groups cannot contain themselves or form a cycle",
          });
          break;
        }
        visited.add(parent);
        parent = layout.nodes[parent]?.parentId;
      }
    }
  })
  .transform((layout) => {
    const defaults: typeof layout.nodes = Object.fromEntries(
      Object.keys(layout.groups).map((id) => [id, { x: 0, y: 0 }]),
    );
    return { ...layout, nodes: { ...defaults, ...layout.nodes } };
  });
export type CustomWidgetEditorLayout = z.infer<typeof customWidgetEditorLayoutSchema>;
export const EMPTY_EDITOR_LAYOUT: CustomWidgetEditorLayout = { version: 1, nodes: {}, groups: {} };
