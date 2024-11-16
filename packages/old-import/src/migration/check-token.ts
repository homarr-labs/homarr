import { decryptSecretWithKey } from "@homarr/common/server";

import type { OldmarrChecksum } from "./schemas/checksum";

export const checkTokenWithChecksum = (checksum: OldmarrChecksum | null, token: string) => {
  if (!checksum) {
    return false;
  }

  const [raw, encrypted] = checksum;

  try {
    const decrypted = decryptSecretWithKey(encrypted, Buffer.from(token, "hex"));
    return decrypted === raw;
  } catch {
    return false;
  }
};
