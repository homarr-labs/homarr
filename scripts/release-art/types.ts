export type ItemKind = "integration" | "widget";

export interface Item {
  kind: ItemKind;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

export interface RenderItem extends Item {
  oneLiner?: string;
  screenshotUrl?: string;
}
