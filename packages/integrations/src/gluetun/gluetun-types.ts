import { z } from "zod/v4";

export const gluetunVpnStatusSchema = z.object({
  status: z.enum(["running", "stopped", "starting", "stopping", "crashed"]),
});

export type GluetunVpnStatus = z.infer<typeof gluetunVpnStatusSchema>;

export const gluetunPublicIpSchema = z.object({
  public_ip: z.union([z.ipv4(), z.ipv6(), z.literal("")]),
  region: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  organization: z.string().optional(),
  postal_code: z.string().optional(),
  timezone: z.string().optional(),
});

export type GluetunPublicIp = z.infer<typeof gluetunPublicIpSchema>;
