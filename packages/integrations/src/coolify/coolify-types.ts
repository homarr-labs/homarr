// Coolify API Types and Schemas based on https://coolify.io/docs/api-reference/api
import { z } from "zod/v4";

// Health check schema
export const coolifyHealthcheckSchema = z.object({
  status: z.string(),
});

export type CoolifyHealthcheck = z.infer<typeof coolifyHealthcheckSchema>;

// Application log schema
export const coolifyApplicationLogSchema = z.object({
  logs: z.string(),
});

export type CoolifyApplicationLog = z.infer<typeof coolifyApplicationLogSchema>;

// Environment variable schema
export const coolifyEnvironmentVariableSchema = z.object({
  id: z.number().nullish(),
  key: z.string(),
  value: z.string(),
  is_build_time: z.boolean().nullish(),
  is_preview: z.boolean().nullish(),
  application_id: z.number().nullish(),
});

export type CoolifyEnvironmentVariable = z.infer<typeof coolifyEnvironmentVariableSchema>;

// Application schema (only fields used in the widget)
export const coolifyApplicationSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
  status: z.string().nullish(),
  fqdn: z.string().nullish(),
  environment_id: z.number().nullish(),
  server_id: z.number().nullish(),
  destination_id: z.number().nullish(),
  updated_at: z.string().nullish(),
  last_online_at: z.string().nullish(),
});

export type CoolifyApplication = z.infer<typeof coolifyApplicationSchema>;

// Project schema
export const coolifyProjectSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
});

export type CoolifyProject = z.infer<typeof coolifyProjectSchema>;

// Environment schema
export const coolifyEnvironmentSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string().nullish(),
  name: z.string(),
  project_id: z.number().nullish(),
});

export type CoolifyEnvironment = z.infer<typeof coolifyEnvironmentSchema>;

// Project with environments schema
export const coolifyProjectWithEnvironmentsSchema = coolifyProjectSchema.extend({
  environments: z.array(coolifyEnvironmentSchema).nullish(),
});

export type CoolifyProjectWithEnvironments = z.infer<typeof coolifyProjectWithEnvironmentsSchema>;

// Resource schema
export const coolifyResourceSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string().nullish(),
});

export type CoolifyResource = z.infer<typeof coolifyResourceSchema>;

// Server settings schema
export const coolifyServerSettingsSchema = z.object({
  server_id: z.number().nullish(),
  is_build_server: z.boolean().nullish(),
  is_reachable: z.boolean().nullish(),
  is_usable: z.boolean().nullish(),
});

export type CoolifyServerSettings = z.infer<typeof coolifyServerSettingsSchema>;

// Server schema
export const coolifyServerSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
  ip: z.string().nullish(),
  is_reachable: z.boolean().nullish(),
  is_usable: z.boolean().nullish(),
  settings: coolifyServerSettingsSchema.nullish(),
});

export type CoolifyServer = z.infer<typeof coolifyServerSchema>;

// Service application schema (nested in services)
export const coolifyServiceApplicationSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
  fqdn: z.string().nullish(),
  status: z.string().nullish(),
});

export type CoolifyServiceApplication = z.infer<typeof coolifyServiceApplicationSchema>;

// Service schema
export const coolifyServiceSchema = z.object({
  id: z.number().nullish(),
  uuid: z.string(),
  name: z.string(),
  status: z.string().nullish(),
  fqdn: z.string().nullish(),
  environment_id: z.number().nullish(),
  server_id: z.number().nullish(),
  destination_id: z.number().nullish(),
  updated_at: z.string().nullish(),
  applications: z.array(coolifyServiceApplicationSchema).nullish(),
});

export type CoolifyService = z.infer<typeof coolifyServiceSchema>;

// Extended types with context (not from API, added by integration)
export interface CoolifyApplicationWithContext extends CoolifyApplication {
  projectName?: string;
  projectUuid?: string;
  environmentName?: string;
  environmentUuid?: string;
}

export interface CoolifyServiceWithContext extends CoolifyService {
  projectName?: string;
  projectUuid?: string;
  environmentName?: string;
  environmentUuid?: string;
}

// Aggregated information for the Coolify instance
export interface CoolifyInstanceInfo {
  version: string;
  applications: CoolifyApplicationWithContext[];
  services: CoolifyServiceWithContext[];
  servers: CoolifyServer[];
}
