export const widgetKinds = ["clock", "weather", "app", "video"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
