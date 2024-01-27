import type { RouterOutputs } from "@homarr/api";
import type { WidgetSort } from "@homarr/widgets";

export type Board = RouterOutputs["board"]["default"];
export type Section = Board["sections"][number];
export type Item = Section["items"][number];

export type CategorySection = Extract<Section, { kind: "category" }>;
export type EmptySection = Extract<Section, { kind: "empty" }>;
export type SidebarSection = Extract<Section, { kind: "sidebar" }>;

export type ItemOfKind<TKind extends WidgetSort> = Extract<
  Item,
  { kind: TKind }
>;
