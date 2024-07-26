export const widgetKinds = [
  "clock",
  "weather",
  "app",
  "iframe",
  "video",
  "notebook",
  "dnsHoleSummary",
  "dnsHoleControls",
  "smartHome-entityState",
  "smartHome-executeAutomation",
  "mediaServer",
  "calendar",
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
