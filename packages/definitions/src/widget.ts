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
  "mediaServer",
  "calendar",
  "usenet-downloads"
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
