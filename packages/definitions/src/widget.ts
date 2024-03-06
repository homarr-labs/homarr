export const widgetKinds = ["clock", "weather", "app"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
