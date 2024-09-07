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
  "mediaRequests-requestList",
  "mediaRequests-requestStats",
  "rssFeed",
  "indexerManager",
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
