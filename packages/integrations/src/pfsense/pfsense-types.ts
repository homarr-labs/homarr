import { z } from "zod/v4";

// API documentation: https://pfrest.org (pfSense REST API package, v2)

const createResponseSchema = <TData extends z.ZodType>(data: TData) =>
  z.object({
    data,
  });

export const pfsenseVersionSchema = createResponseSchema(
  z.object({
    version: z.string(),
  }),
);

export const pfsenseSystemStatusSchema = createResponseSchema(
  z.object({
    cpu_usage: z.number().nullable().catch(null),
    mem_usage: z.number().nullable().catch(null),
  }),
);

export const pfsenseInterfacesSchema = createResponseSchema(
  z.array(
    z.object({
      name: z.string().nullish(),
      descr: z.string().nullish(),
      // Interfaces without a running device (e.g. a stopped VPN) may report no counters.
      inbytes: z.number().nullish(),
      outbytes: z.number().nullish(),
    }),
  ),
);
