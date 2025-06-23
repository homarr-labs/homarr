import { z } from "zod";

// API documentation : https://docs.opnsense.org/development/api.html#core-api

export const opnsenseSystemSummarySchema = z.object({
  name: z.string(),
  versions: z.array(z.string()),
});

export const opnsenseActivitySchema = z.object({
  headers: z.array(z.string()),
  details: z.array(
    z.object({
      C: z.string(),
      PID: z.string(),
      THR: z.string(),
      USERNAME: z.string(),
      PRI: z.string(),
      NICE: z.string(),
      SIZE: z.string(),
      RES: z.string(),
      STATE: z.string(),
      TIME: z.string(),
      WCPU: z.string(),
      COMMAND: z.string(),
    }),
  ),
});

export const opnsenseMemorySchema = z.object({
  memory: z.object({
    total: z.string(),
    total_frmt: z.string(),
    used: z.number(),
    used_frmt: z.string(),
    arc: z.string(),
    arc_frmt: z.string(),
    arc_txt: z.string(),
  }),
});

const interfaceSchema = z.object({
  device: z.string(),
  driver: z.string(),
  index: z.string(),
  flags: z.string(),
  "promiscuous listeners": z.string(),
  "send queue length": z.string(),
  "send queue max length": z.string(),
  "send queue drops": z.string(),
  type: z.string(),
  "address length": z.string(),
  "header length": z.string(),
  "link state": z.string(),
  vhid: z.string(),
  datalen: z.string(),
  mtu: z.string(),
  metric: z.string(),
  "line rate": z.string(),
  "packets received": z.string(),
  "input errors": z.string(),
  "packets transmitted": z.string(),
  "output errors": z.string(),
  collisions: z.string(),
  "bytes received": z.string(),
  "bytes transmitted": z.string(),
  "multicasts received": z.string(),
  "multicasts transmitted": z.string(),
  "input queue drops": z.string(),
  "packets for unknown protocol": z.string(),
  "HW offload capabilities": z.string(),
  "uptime at attach or stat reset": z.string(),
  name: z.string(),
});

export const opnsenseInterfacesSchema = z.object({
  interfaces: z.record(interfaceSchema),
  time: z.number(),
});

export interface opnsenseMemorySummary {
  used: number;
  total: number;
  percent: number;
}

export interface opnsenseInterfaceSummary {
  receive: number;
  transmit: number;
  name: string;
}

export const opnsenseCPUSchema = z.object({
  total: z.number(),
  //  user: z.number(),
  // Nice here is the percentage of time that the kernel spent running processes with a positive nice value (aka, processes with a lesser priority than other).
  // nice: z.number(),
  // sys: z.number(),
  // intr: z.number(),
  // idle: z.number(),
});
