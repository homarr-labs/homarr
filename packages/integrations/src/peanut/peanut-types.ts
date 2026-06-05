import { z } from "zod/v4";

// PeaNUT returns each device as a flat map of NUT variables (e.g. "ups.status",
// "battery.charge"). Values are either strings or numbers depending on the
// variable, so we accept both and coerce them when mapping to a UpsSummary.
export const peaNutDeviceSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export const peaNutDevicesSchema = z.array(peaNutDeviceSchema);

export type PeaNutDevice = z.infer<typeof peaNutDeviceSchema>;
