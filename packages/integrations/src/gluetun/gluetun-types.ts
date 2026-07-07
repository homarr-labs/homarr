import { z } from "zod/v4";

export const gluetunVpnStatusSchema = z.object({
  status: z.string(),
});

export type GluetunVpnStatus = z.infer<typeof gluetunVpnStatusSchema>;

export const gluetunDnsStatusSchema = gluetunVpnStatusSchema;

export type GluetunDnsStatus = z.infer<typeof gluetunDnsStatusSchema>;

export const gluetunPublicIpSchema = z.object({
  public_ip: z.string(),
  region: z.string(),
  country: z.string(),
  city: z.string(),
  location: z.string(),
  organization: z.string(),
  postal_code: z.string(),
  timezone: z.string(),
});

export type GluetunPublicIp = z.infer<typeof gluetunPublicIpSchema>;

const gluetunServerSelectionOpenvpnSchema = z.object({
  config_file_path: z.string(),
  protocol: z.string(),
  endpoint_ip: z.string(),
  custom_port: z.number(),
  pia_encryption_preset: z.string(),
});

const gluetunServerSelectionWireguardSchema = z.object({
  endpoint_ip: z.string(),
  endpoint_port: z.number(),
  public_key: z.string(),
});

const gluetunServerSelectionSchema = z.object({
  vpn: z.string(),
  countries: z.array(z.string()).nullable(),
  categories: z.array(z.string()).nullable(),
  regions: z.array(z.string()).nullable(),
  cities: z.array(z.string()).nullable(),
  isps: z.array(z.string()).nullable(),
  names: z.array(z.string()).nullable(),
  numbers: z.array(z.number()).nullable(),
  hostnames: z.array(z.string()).nullable(),
  owned_only: z.boolean(),
  free_only: z.boolean(),
  premium_only: z.boolean(),
  stream_only: z.boolean(),
  multi_hop_only: z.boolean(),
  port_forward_only: z.boolean(),
  secure_core_only: z.boolean(),
  tor_only: z.boolean(),
  openvpn: gluetunServerSelectionOpenvpnSchema,
  wireguard: gluetunServerSelectionWireguardSchema,
});

const gluetunPortForwardingSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  status_file_path: z.string(),
  up_command: z.string(),
  down_command: z.string(),
  listening_port: z.union([z.number(), z.array(z.number())]),
  username: z.string(),
  password: z.string(),
});

const gluetunProviderSchema = z.object({
  name: z.string(),
  server_selection: gluetunServerSelectionSchema,
  port_forwarding: gluetunPortForwardingSchema,
});

const gluetunOpenvpnSettingsSchema = z.object({
  version: z.string(),
  user: z.string(),
  password: z.string(),
  config_file_path: z.string(),
  ciphers: z.array(z.string()).nullable(),
  auth: z.string(),
  cert: z.string(),
  key: z.string(),
  encrypted_key: z.string(),
  key_passphrase: z.string(),
  pia_encryption_preset: z.string(),
  mssfix: z.number(),
  interface: z.string(),
  process_user: z.string(),
  verbosity: z.number(),
  flags: z.array(z.string()).nullable(),
});

const gluetunWireguardSettingsSchema = z.object({
  private_key: z.string(),
  pre_shared_key: z.string(),
  addresses: z.array(z.string()).nullable(),
  allowed_ips: z.array(z.string()),
  interface: z.string(),
  persistent_keep_alive_interval: z.number(),
  mtu: z.number(),
  implementation: z.string(),
});

export const gluetunVpnSettingsSchema = z.object({
  type: z.string(),
  provider: gluetunProviderSchema,
  openvpn: gluetunOpenvpnSettingsSchema,
  wireguard: gluetunWireguardSettingsSchema,
});

export type GluetunVpnSettings = z.infer<typeof gluetunVpnSettingsSchema>;
