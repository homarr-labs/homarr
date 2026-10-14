import { z } from "zod";

const strings = z.array(z.string());
const os = z.object({ name: z.string().optional(), version: z.string().optional(), platform: z.string().optional() });

export const wazuhMonitoringSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  ip: z.string().optional(),
  status: z.string().optional(),
  version: z.string().optional(),
  lastKeepAlive: z.string().optional(),
  timestamp: z.string().optional(),
  group: z.union([strings, z.string()]).optional(),
  os: os.optional(),
});

export const wazuhApiAgentSchema = wazuhMonitoringSchema.extend({ id: z.string(), group: strings.optional() });

export const wazuhAlertSourceSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  rule: z
    .object({
      id: z.string().optional(),
      level: z.number().optional(),
      description: z.string().optional(),
      groups: strings.optional(),
      mitre: z.object({ id: strings.optional(), tactic: strings.optional(), technique: strings.optional() }).optional(),
    })
    .optional(),
  agent: z.object({ id: z.string().optional(), name: z.string().optional(), ip: z.string().optional() }).optional(),
  data: z.object({ srcip: z.string().optional(), dstuser: z.string().optional() }).optional(),
  syscheck: z
    .object({
      path: z.string().optional(),
      event: z.string().optional(),
      value_name: z.string().optional(),
      uname_after: z.string().optional(),
      audit: z
        .object({
          effective_user: z.object({ name: z.string().optional() }).optional(),
          user: z.object({ name: z.string().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
});

export const wazuhSummaryStatusSchema = z.object({
  connection: z
    .object({
      active: z.number().optional(),
      disconnected: z.number().optional(),
      never_connected: z.number().optional(),
      pending: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
});
export const wazuhItemsSchema = <T>(item: z.ZodType<T>) =>
  z.object({ affected_items: z.array(item), total_affected_items: z.number() });
export const wazuhBucketSchema = z.object({ key: z.string(), doc_count: z.number() });
export const wazuhNumericBucketSchema = z.object({ key: z.number(), doc_count: z.number() });
export const wazuhBucketsSchema = z.object({ buckets: z.array(wazuhBucketSchema) });
export const wazuhSeveritySchema = wazuhBucketsSchema.optional();
export const wazuhValueSchema = z.object({ value: z.number() });
export const wazuhNullableValueSchema = z.object({ value: z.number().nullable() });

export const wazuhSearchSchema = <TSource, TAggregations>(
  source: z.ZodType<TSource>,
  aggregations: z.ZodType<TAggregations>,
) =>
  z.object({
    hits: z.object({
      total: z.union([z.number(), z.object({ value: z.number(), relation: z.string() })]).optional(),
      hits: z.array(z.object({ _id: z.string(), _index: z.string().optional(), _source: source })),
    }),
    aggregations: aggregations.optional(),
  });
