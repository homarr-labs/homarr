import type { NetworkControllerSummary } from "@homarr/integrations/types";

export type NetworkControllerMatrixSectionKey = "wan" | "web" | "wifi" | "lan" | "vpn";
export type NetworkControllerMatrixMetricKey = "latency" | "ping" | "uptime" | "users" | "guests";

export interface NetworkControllerMatrixSection {
  key: NetworkControllerMatrixSectionKey;
  status: "enabled" | "disabled";
  metrics: { key: NetworkControllerMatrixMetricKey; value: number }[];
}

export const getNetworkControllerMatrix = (summary: NetworkControllerSummary): NetworkControllerMatrixSection[] => [
  { key: "wan", status: summary.wanStatus, metrics: [] },
  {
    key: "web",
    status: summary.www.status,
    metrics: [
      { key: "latency", value: summary.www.latency },
      { key: "ping", value: summary.www.ping },
      { key: "uptime", value: summary.www.uptime },
    ],
  },
  {
    key: "wifi",
    status: summary.wifi.status,
    metrics: [
      { key: "users", value: summary.wifi.users },
      { key: "guests", value: summary.wifi.guests },
    ],
  },
  {
    key: "lan",
    status: summary.lan.status,
    metrics: [
      { key: "users", value: summary.lan.users },
      { key: "guests", value: summary.lan.guests },
    ],
  },
  { key: "vpn", status: summary.vpn.status, metrics: [{ key: "users", value: summary.vpn.users }] },
];
