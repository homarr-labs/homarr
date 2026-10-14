import { z } from "zod";

import type {
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemStats,
  BeszelSystemStatsRecord,
  BeszelContainer,
  BeszelContainerStats,
  BeszelContainerStatsRecord,
  BeszelSmartDevice,
  BeszelSystemdService,
  BeszelAlert,
  BeszelAlertHistory,
} from "../../beszel/beszel-types";

const pair = z.tuple([z.number(), z.number()]);
const triple = z.tuple([z.number(), z.number(), z.number()]);
const quad = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const numberMap = z.record(z.string(), z.number());

export const beszelAuthSchema = z
  .object({ token: z.string(), record: z.object({ id: z.string() }).passthrough() })
  .passthrough();
export const beszelSystemSchema: z.ZodType<BeszelSystem> = z
  .object({
    id: z.string(),
    name: z.string(),
    host: z.string(),
    port: z.string(),
    status: z.enum(["up", "down", "paused", "pending"]),
    info: z
      .object({
        h: z.string().optional(),
        cpu: z.number(),
        t: z.number().optional(),
        c: z.number().optional(),
        ct: z.number().optional(),
        m: z.string().optional(),
        la: triple.optional(),
        o: z.string().optional(),
        u: z.number(),
        mp: z.number(),
        dp: z.number(),
        bat: pair.optional(),
        b: z.number().optional(),
        bb: z.number().optional(),
        v: z.string(),
        p: z.boolean().optional(),
        g: z.number().optional(),
        dt: z.number().optional(),
        os: z.number().optional(),
        efs: numberMap.optional(),
        sv: pair.optional(),
      })
      .passthrough(),
    users: z.array(z.string()).optional(),
    created: z.string(),
    updated: z.string(),
  })
  .passthrough();
export const beszelDetailsSchema: z.ZodType<BeszelSystemDetails> = z
  .object({
    id: z.string(),
    system: z.string(),
    hostname: z.string(),
    kernel: z.string(),
    cores: z.number(),
    threads: z.number(),
    cpu: z.string(),
    os: z.number(),
    os_name: z.string(),
    arch: z.string(),
    memory: z.number(),
    podman: z.boolean(),
    updated: z.string(),
  })
  .passthrough();
const extraFsSchema = z
  .object({
    d: z.number(),
    du: z.number(),
    r: z.number(),
    w: z.number(),
    rm: z.number().optional(),
    wm: z.number().optional(),
    rb: z.number().optional(),
    wb: z.number().optional(),
    rbm: z.number().optional(),
    wbm: z.number().optional(),
  })
  .passthrough();
const gpuSchema = z
  .object({
    n: z.string(),
    mu: z.number().optional(),
    mt: z.number().optional(),
    u: z.number(),
    p: z.number().optional(),
    pp: z.number().optional(),
    e: numberMap.optional(),
  })
  .passthrough();
export const beszelStatsSchema: z.ZodType<BeszelSystemStats> = z
  .object({
    cpu: z.number(),
    cpum: z.number().optional(),
    cpub: z.array(z.number()).optional(),
    cpus: z.array(z.number()).optional(),
    la: triple.optional(),
    m: z.number(),
    mu: z.number(),
    mp: z.number(),
    mb: z.number(),
    mm: z.number().optional(),
    mz: z.number().optional(),
    s: z.number(),
    su: z.number(),
    d: z.number(),
    du: z.number(),
    dp: z.number(),
    dr: z.number().optional(),
    dw: z.number().optional(),
    drm: z.number().optional(),
    dwm: z.number().optional(),
    dio: pair.optional(),
    diom: pair.optional(),
    ns: z.number().optional(),
    nr: z.number().optional(),
    b: pair.optional(),
    nsm: z.number().optional(),
    nrm: z.number().optional(),
    bm: pair.optional(),
    t: numberMap.optional(),
    efs: z.record(z.string(), extraFsSchema).optional(),
    g: z.record(z.string(), gpuSchema).optional(),
    bat: pair.optional(),
    ni: z.record(z.string(), quad).optional(),
  })
  .passthrough();
export const beszelStatsRecordSchema: z.ZodType<BeszelSystemStatsRecord> = z
  .object({
    id: z.string(),
    system: z.string(),
    stats: beszelStatsSchema,
    type: z.string(),
    created: z.string(),
    updated: z.string(),
  })
  .passthrough();
export const beszelContainerSchema: z.ZodType<BeszelContainer> = z
  .object({
    id: z.string(),
    system: z.string(),
    name: z.string(),
    image: z.string(),
    status: z.string(),
    health: z.number(),
    cpu: z.number(),
    memory: z.number(),
    net: z.number(),
    ports: z.string().optional(),
    updated: z.number(),
  })
  .passthrough();
export const beszelContainerStatsSchema: z.ZodType<BeszelContainerStats> = z
  .object({
    n: z.string(),
    c: z.number(),
    m: z.number(),
    ns: z.number().optional(),
    nr: z.number().optional(),
    b: pair.optional(),
  })
  .passthrough();
export const beszelContainerStatsRecordSchema: z.ZodType<BeszelContainerStatsRecord> = z
  .object({
    id: z.string(),
    system: z.string(),
    stats: z.array(beszelContainerStatsSchema),
    type: z.string(),
    created: z.string(),
    updated: z.string(),
  })
  .passthrough();
const attributeSchema = z
  .object({
    id: z.number().optional(),
    n: z.string(),
    v: z.number(),
    w: z.number().optional(),
    t: z.number().optional(),
    rv: z.number().optional(),
    rs: z.string().optional(),
    wf: z.string().optional(),
  })
  .passthrough();
export const beszelSmartSchema: z.ZodType<BeszelSmartDevice> = z
  .object({
    id: z.string(),
    system: z.string(),
    name: z.string(),
    model: z.string(),
    state: z.string(),
    capacity: z.number(),
    temp: z.number(),
    firmware: z.string(),
    serial: z.string(),
    type: z.string(),
    hours: z.number(),
    cycles: z.number(),
    attributes: z.array(attributeSchema),
    updated: z.string(),
  })
  .passthrough();
export const beszelServiceSchema: z.ZodType<BeszelSystemdService> = z
  .object({
    id: z.string(),
    system: z.string(),
    name: z.string(),
    state: z.number(),
    sub: z.number(),
    cpu: z.number(),
    cpuPeak: z.number(),
    memory: z.number(),
    memPeak: z.number(),
    updated: z.number(),
  })
  .passthrough();
export const beszelAlertSchema: z.ZodType<BeszelAlert> = z
  .object({
    id: z.string(),
    user: z.string(),
    system: z.string(),
    name: z.string(),
    triggered: z.boolean(),
    value: z.number(),
    min: z.number(),
  })
  .passthrough();
export const beszelAlertHistorySchema: z.ZodType<BeszelAlertHistory> = z
  .object({
    id: z.string(),
    alert: z.string(),
    user: z.string(),
    system: z.string(),
    name: z.string(),
    val: z.number(),
    created: z.string(),
    resolved: z.string().nullable().optional(),
  })
  .passthrough();
