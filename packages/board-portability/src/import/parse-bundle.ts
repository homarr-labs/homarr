import type { HomarrBundle } from "../schema";
import { homarrBundleSchema } from "../schema";

export const parseBundleJson = (content: string): HomarrBundle => {
  const parsed: unknown = JSON.parse(content);
  return homarrBundleSchema.parse(parsed);
};
