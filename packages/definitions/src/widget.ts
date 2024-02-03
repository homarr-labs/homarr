export const widgetKinds = ["clock", "weather"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
