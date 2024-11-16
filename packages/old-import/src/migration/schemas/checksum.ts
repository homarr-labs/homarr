import { validation, z } from "@homarr/validation";

export const oldmarrChecksumSchema = z.tuple([z.string(), validation.common.encryptedValue]);

export type OldmarrChecksum = z.infer<typeof oldmarrChecksumSchema>;
