import { z } from "zod/v4";

const name = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9._-]*$/u)
  .refine((value) => !["__proto__", "prototype", "constructor"].includes(value), "Reserved fixture name");
const delayMs = z.number().int().min(0).max(30_000).optional();

export const widgetPreviewQueryFixtureSchema = z.union([
  z.strictObject({ data: z.json(), delayMs }),
  z.strictObject({
    error: z.strictObject({
      message: z.string().min(1).max(2048),
      code: z.enum(["BAD_REQUEST", "NOT_FOUND", "TIMEOUT", "INTERNAL_SERVER_ERROR"]).optional(),
    }),
    delayMs,
  }),
]);

export const widgetPreviewScenarioSchema = z.strictObject({
  label: z.string().trim().min(1).max(128),
  description: z.string().max(2048).optional(),
  queries: z
    .record(name, widgetPreviewQueryFixtureSchema)
    .refine((queries) => Object.keys(queries).length <= 64, "A scenario supports at most 64 query fixtures"),
});

export const widgetPreviewScenariosSchema = z
  .record(name, widgetPreviewScenarioSchema)
  .refine((scenarios) => Object.keys(scenarios).length <= 16, "A package supports at most 16 preview scenarios")
  .refine(
    (scenarios) => new TextEncoder().encode(JSON.stringify(scenarios)).length <= 2 * 1024 * 1024,
    "Preview scenarios exceed the 2 MiB limit",
  );

export type WidgetPreviewScenario = z.infer<typeof widgetPreviewScenarioSchema>;
export type WidgetPreviewQueryFixture = z.infer<typeof widgetPreviewQueryFixtureSchema>;
