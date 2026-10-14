import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import type { FirewallCpuSummary } from "../../interfaces/firewall-summary/firewall-summary-types";
import type { NetworkControllerSummary } from "../../interfaces/network-controller-summary/network-controller-summary-types";
import type { UpsSummary } from "../../interfaces/ups-summary/ups-summary-types";
import type { VpnSummary } from "../../interfaces/vpn-summary/vpn-summary-types";
import type { StatsMetric } from "../../stats/types";

export const dnsSummaryMetrics: StatsMetric[] = [
  { key: "dnsQueriesToday", label: "Queries today", unit: "count" },
  { key: "adsBlockedToday", label: "Blocked today", unit: "count" },
  { key: "adsBlockedTodayPercentage", label: "Blocked", unit: "percent" },
  { key: "domainsBeingBlocked", label: "Blocked domains", unit: "count" },
];

export const pickDnsSummaryStats = ({
  dnsQueriesToday,
  adsBlockedToday,
  adsBlockedTodayPercentage,
  domainsBeingBlocked,
}: DnsHoleSummary) => ({ dnsQueriesToday, adsBlockedToday, adsBlockedTodayPercentage, domainsBeingBlocked });

export const gluetunMetrics: StatsMetric[] = [
  { key: "status", label: "VPN status", unit: "text" },
  { key: "publicIp", label: "Public IP", unit: "text" },
  { key: "country", label: "Country", unit: "text" },
];

export const pickGluetunStats = (data: VpnSummary) => ({
  status: data.vpnStatus,
  publicIp: data.publicIp,
  country: data.country,
});

export const unifiControllerMetrics: StatsMetric[] = [
  { key: "wifi", label: "Wi-Fi clients", unit: "count" },
  { key: "lan", label: "Wired clients", unit: "count" },
  { key: "latency", label: "WAN latency", unit: "milliseconds" },
];

export const pickUnifiControllerStats = (data: NetworkControllerSummary) => ({
  wifi: data.wifi.users + data.wifi.guests,
  lan: data.lan.users + data.lan.guests,
  latency: data.www.latency,
});

export const peaNutMetrics: StatsMetric[] = [
  { key: "devices", label: "UPS devices", unit: "count" },
  { key: "onBattery", label: "On battery", unit: "count" },
  { key: "lowBattery", label: "Low battery", unit: "count" },
];

export const pickPeaNutStats = (data: UpsSummary[]) => ({
  devices: data.length,
  onBattery: data.filter((item) => item.status === "onBattery").length,
  lowBattery: data.filter((item) => item.status === "lowBattery").length,
});

export const opnsenseMetrics: StatsMetric[] = [{ key: "cpu", label: "CPU", unit: "percent" }];

export const pickOPNsenseStats = (data: FirewallCpuSummary) => ({ cpu: data.total });

export const homeAssistantMetrics: StatsMetric[] = [
  { key: "entities", label: "Entities", unit: "count" },
  { key: "unavailable", label: "Unavailable entities", unit: "count" },
  { key: "lightsOn", label: "Lights on", unit: "count" },
  { key: "peopleHome", label: "People home", unit: "count" },
];

export const pickHomeAssistantStats = (data: {
  entities: number;
  unavailable: number;
  lightsOn: number;
  peopleHome: number;
}) => data;
