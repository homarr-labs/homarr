export const widgetKinds = ["clock", "weather", "app", "iframe"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
