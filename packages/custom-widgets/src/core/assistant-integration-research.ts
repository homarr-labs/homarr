import { z } from "zod/v4";

export const assistantIntegrationResearchToolName = "customWidget_recordIntegrationResearch";

const httpUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  }, "Use an HTTP(S) URL without embedded credentials");

const researchSourceSchema = z.object({
  url: httpUrlSchema.describe("Primary or official API documentation URL used for this contract."),
  title: z.string().trim().min(1).max(200),
});

const endpointContractSchema = z.object({
  purpose: z.string().trim().min(1).max(200),
  method: z.enum(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]),
  path: z
    .string()
    .trim()
    .min(1)
    .max(2_048)
    .regex(/^\/(?!\/)/u)
    .refine((path) => !path.includes("?") && !path.includes("#"), "Put query names in query, not in path")
    .describe("Documented slash-prefixed path relative to the saved integration URL."),
  query: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  requestBody: z.string().trim().min(1).max(1_500).optional(),
  responseShape: z.string().trim().min(1).max(2_500),
  permissionNotes: z.string().trim().min(1).max(500).optional(),
});

const researchConnectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("savedIntegration"),
    integrationId: z.string().trim().min(1).max(128),
    integrationName: z.string().trim().min(1).max(256),
    integrationKind: z.string().trim().min(1).max(100),
  }),
  z.object({
    type: z.literal("directHttp"),
    integrationKindAvailable: z.literal(false),
    baseUrlSource: z.enum(["exactUserSupplied", "secureConfigurationPlaceholder"]),
  }),
]);

const readyResearchSchema = z.object({
  status: z.literal("ready"),
  service: z.string().trim().min(1).max(120),
  connection: researchConnectionSchema,
  authentication: z
    .string()
    .trim()
    .min(1)
    .max(800)
    .describe("Documented authentication mechanism, never an actual credential."),
  officialSources: z.array(researchSourceSchema).min(1).max(6),
  endpoints: z.array(endpointContractSchema).min(1).max(16),
  limitations: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
});

const unavailableResearchSchema = z.object({
  status: z.literal("unavailable"),
  service: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(1_000),
  attemptedSources: z.array(researchSourceSchema).max(6).default([]),
});

export const assistantIntegrationResearchSchema = z.discriminatedUnion("status", [
  readyResearchSchema,
  unavailableResearchSchema,
]);

export type AssistantIntegrationResearch = z.infer<typeof assistantIntegrationResearchSchema>;

export const getAssistantIntegrationResearchOutput = (research: AssistantIntegrationResearch) => {
  if (research.status === "unavailable") {
    return {
      recorded: false,
      ...research,
      nextStep:
        "Stop before authoring. Briefly identify the missing official API contract and ask the user for its documentation; never invent an endpoint or request credentials.",
    };
  }
  return {
    recorded: true,
    ...research,
    nextStep:
      "Reuse this exact contract in later steps. Probe documented GET endpoints through the selected saved integration, then author, validate, preview, test, persist, and place the widget.",
  };
};
