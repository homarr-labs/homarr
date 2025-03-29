export interface NetworkControllerSummary {
  wanStatus: "enabled" | "disabled";

  www: {
    status: "enabled" | "disabled";
    latency: number;
    ping: number;
    uptime: number;
  };

  wifiStatus: "enabled" | "disabled";
  wifiUsers: number;
  wifiGuests: number;

  lanStatus: "enabled" | "disabled";
  lanUsers: number;
  lanGuests: number;

  vpnStatus: "enabled" | "disabled";
  vpnUsers: number;
}
