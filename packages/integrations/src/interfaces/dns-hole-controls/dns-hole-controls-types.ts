export interface DnsHoleControls {
  status: "enabled" | "disabled";
  action: "enable" | "disable";
  duration?: number;
}
