import { z } from "zod/v4";

export const calendarsSchema = z.array(
  z.object({
    name: z.string(),
    entity_id: z.string(),
  }),
);

const calendarMomentSchema = z
  .object({
    date: z.string(),
  })
  .or(
    z.object({
      dateTime: z.string(),
    }),
  );
export const calendarEventSchema = z.object({
  start: calendarMomentSchema,
  end: calendarMomentSchema,
  summary: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
});

const compressedContextSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
  }),
]);

export const restStateSchema = z.object({
  entity_id: z.string(),
  state: z.string(),
  attributes: z.record(z.string(), z.unknown()),
  last_changed: z.string(),
  last_updated: z.string(),
  context: z.object({ id: z.string() }).optional(),
});

const compressedStateSchema = z.object({
  s: z.string(),
  a: z.record(z.string(), z.unknown()).default({}),
  lc: z.number(),
  lu: z.number().optional(),
  c: compressedContextSchema.optional(),
});

const compressedDiffSchema = z.object({
  "+": z
    .object({
      s: z.string().optional(),
      a: z.record(z.string(), z.unknown()).optional(),
      lc: z.number().optional(),
      lu: z.number().optional(),
      c: compressedContextSchema.optional(),
    })
    .optional(),
  "-": z.object({ a: z.array(z.string()).optional() }).optional(),
});

export const compressedStateEventSchema = z.object({
  a: z.record(z.string(), compressedStateSchema).optional(),
  r: z.array(z.string()).optional(),
  c: z.record(z.string(), compressedDiffSchema).optional(),
});

export const areaRegistrySchema = z.array(
  z.object({
    area_id: z.string(),
    name: z.string(),
    floor_id: z.string().nullish(),
    icon: z.string().nullish(),
    temperature_entity_id: z.string().nullish(),
    humidity_entity_id: z.string().nullish(),
  }),
);

export const floorRegistrySchema = z.array(
  z.object({
    floor_id: z.string(),
    name: z.string(),
    level: z.number().nullish(),
    icon: z.string().nullish(),
  }),
);

export const deviceRegistrySchema = z.array(
  z.object({
    id: z.string(),
    area_id: z.string().nullish(),
    name: z.string().nullish(),
    name_by_user: z.string().nullish(),
  }),
);

export const entityDisplayRegistrySchema = z.object({
  entity_categories: z.record(z.string(), z.string()).default({}),
  entities: z.array(
    z.object({
      ei: z.string(),
      ai: z.string().optional(),
      di: z.string().optional(),
      en: z.string().optional(),
      ic: z.string().optional(),
      ec: z.number().optional(),
      hb: z.boolean().optional(),
    }),
  ),
});

export const historyResultSchema = z.record(
  z.string(),
  z.array(
    z.object({
      s: z.string(),
      lu: z.number().optional(),
      lc: z.number().optional(),
    }),
  ),
);

export const forecastResponseSchema = z.object({
  service_response: z.record(
    z.string(),
    z.object({
      forecast: z.array(
        z.object({
          datetime: z.string(),
          condition: z.string().nullish(),
          temperature: z.number().nullish(),
          templow: z.number().nullish(),
          precipitation_probability: z.number().nullish(),
        }),
      ),
    }),
  ),
});

export interface RawEntityState {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: number;
  lastUpdated: number;
  contextId?: string;
}

export interface HomeAssistantRegistry {
  areas: z.infer<typeof areaRegistrySchema>;
  floors: z.infer<typeof floorRegistrySchema>;
  devices: z.infer<typeof deviceRegistrySchema>;
  entities: z.infer<typeof entityDisplayRegistrySchema>;
}
