import { z } from "zod";

export const traefikResourceStatusSchema = z.enum(["enabled", "disabled", "warning", "error", "unknown"]);

const traefikResourceSchema = z
  .object({
    name: z.string().optional(),
    provider: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const traefikVersionSchema = z
  .object({
    Version: z.string().optional(),
  })
  .passthrough();

export const traefikResourcesSchema = z.array(traefikResourceSchema);

export interface TraefikResourceSummary {
  total: number;
  enabled: number;
  warnings: number;
  errors: number;
}

export interface TraefikProtocolSummary {
  routers: TraefikResourceSummary;
  services: TraefikResourceSummary;
  middlewares: TraefikResourceSummary;
}

export interface TraefikResourceDetail {
  protocol: "http" | "tcp" | "udp";
  type: "router" | "service" | "middleware";
  name: string;
  provider: string | null;
  status: TraefikResourceStatus;
}

export interface TraefikDashboardData {
  version: string | null;
  entryPoints: string[];
  resources: TraefikResourceDetail[];
  failedEndpoints: string[];
  http: TraefikProtocolSummary;
  tcp: TraefikProtocolSummary;
  udp: Omit<TraefikProtocolSummary, "middlewares">;
}

export type TraefikResource = z.infer<typeof traefikResourcesSchema>[number];
export type TraefikResourceStatus = z.infer<typeof traefikResourceStatusSchema>;
