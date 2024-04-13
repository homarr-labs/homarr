export const widgetKinds = [
  "clock",
  "weather",
  "app",
  "iframe",
  "video",
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
