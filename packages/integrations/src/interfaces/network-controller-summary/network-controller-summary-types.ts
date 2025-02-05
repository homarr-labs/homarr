export interface NetworkControllerSummary {
  wanStatus: "enabled" | "disabled";

  wwwStatus: "enabled" | "disabled";
  wwwLatency: number;
  wwwPing: number;
  wwwUptime: number;

  wifiStatus: "enabled" | "disabled";
  wifiUsers: number;
  wifiGuests: number;

  lanStatus: "enabled" | "disabled";
  lanUsers: number;
  lanGuests: number;

  vpnStatus: "enabled" | "disabled";
  vpnUsers: number;
}
