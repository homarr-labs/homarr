export const widgetKinds = [
  "clock",
  "weather",
  "app",
  "iframe",
  "video",
  "notebook",
  "dnsHoleSummary",
  "smartHome-entityState",
  "smartHome-executeAutomation",
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
