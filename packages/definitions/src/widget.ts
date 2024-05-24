export const widgetKinds = ["clock", "weather", "app", "iframe", "video", "notebook"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
