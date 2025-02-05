import { z } from "zod";

export const healthSchema = z.discriminatedUnion("subsystem", [
  z.object({
    subsystem: z.literal("wlan"),
    num_user: z.number(),
    num_guest: z.number(),
    num_iot: z.number(),
    "tx_bytes-r": z.number(),
    "rx_bytes-r": z.number(),
    status: z.string(),
    num_ap: z.number(),
    num_adopted: z.number(),
    num_disabled: z.number(),
    num_disconnected: z.number(),
    num_pending: z.number(),
  }),
  z.object({
    subsystem: z.literal("wan"),
    num_gw: z.number(),
    num_adopted: z.number(),
    num_disconnected: z.number(),
    num_pending: z.number(),
    status: z.string(),
    wan_ip: z.string().ip(),
    gateways: z.array(z.string().ip()),
    netmask: z.string().ip(),
    nameservers: z.array(z.string().ip()).optional(),
    num_sta: z.number(),
    "tx_bytes-r": z.number(),
    "rx_bytes-r": z.number(),
    gw_mac: z.string(),
    gw_name: z.string(),
    "gw_system-stats": z.object({
      cpu: z.string(),
      mem: z.string(),
      uptime: z.string(),
    }),
    gw_version: z.string(),
    isp_name: z.string(),
    isp_organization: z.string(),
    uptime_stats: z.object({
      WAN: z.object({
        alerting_monitors: z.array(
          z.object({
            availability: z.number(),
            latency_average: z.number(),
            target: z.string(),
            type: z.enum(["icmp", "dns"]),
          }),
        ),
        availability: z.number(),
        latency_average: z.number(),
        monitors: z.array(
          z.object({
            availability: z.number(),
            latency_average: z.number(),
            target: z.string(),
            type: z.enum(["icmp", "dns"]),
          }),
        ),
        time_period: z.number(),
        uptime: z.number(),
      }),
    }),
  }),
  z.object({
    subsystem: z.literal("www"),
    status: z.string(),
    "tx_bytes-r": z.number(),
    "rx_bytes-r": z.number(),
    latency: z.number(),
    uptime: z.number(),
    drops: z.number(),
    xput_up: z.number(),
    xput_down: z.number(),
    speedtest_status: z.string(),
    speedtest_lastrun: z.number(),
    speedtest_ping: z.number(),
    gw_mac: z.string(),
  }),
  z.object({
    subsystem: z.literal("lan"),
    lan_ip: z.string().ip().nullish(),
    status: z.string(),
    num_user: z.number(),
    num_guest: z.number(),
    num_iot: z.number(),
    "tx_bytes-r": z.number(),
    "rx_bytes-r": z.number(),
    num_sw: z.number(),
    num_adopted: z.number(),
    num_disconnected: z.number(),
    num_pending: z.number(),
  }),
  z.object({
    subsystem: z.literal("vpn"),
    status: z.string(),
    remote_user_enabled: z.boolean(),
    remote_user_num_active: z.number(),
    remote_user_num_inactive: z.number(),
    remote_user_rx_bytes: z.number(),
    remote_user_tx_bytes: z.number(),
    remote_user_rx_packets: z.number(),
    remote_user_tx_packets: z.number(),
    site_to_site_enabled: z.boolean(),
  }),
]);

export type Health = z.infer<typeof healthSchema>;

export const siteSchema = z.object({
  anonymous_id: z.string().uuid(),
  name: z.string(),
  external_id: z.string().uuid(),
  _id: z.string(),
  attr_no_delete: z.boolean(),
  attr_hidden_id: z.string(),
  desc: z.string(),
  health: z.array(healthSchema),
  num_new_alarms: z.number(),
});
export type Site = z.infer<typeof siteSchema>;

export const unifiSummaryResponseSchema = z.object({
  meta: z.object({
    rc: z.enum(["ok"]),
  }),
  data: z.array(siteSchema),
});
