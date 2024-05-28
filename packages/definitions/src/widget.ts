export const widgetKinds = ["clock", "weather", "app", "iframe", "video", "notebook", "dnsHoleSummary"] as const;
export type WidgetKind = (typeof widgetKinds)[number];
