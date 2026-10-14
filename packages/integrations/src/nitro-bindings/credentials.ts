import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { IntegrationCredentialCodec } from "./configuration";
import { IntegrationBindingError } from "./errors";

export const createIntegrationCredentialCodec = (
  sourceKey: Uint8Array,
): IntegrationCredentialCodec & { dispose(): void } => {
  if (sourceKey.byteLength !== 32) throw new IntegrationBindingError("credential-codec");
  const key = Buffer.from(sourceKey);
  const fingerprintKey = createHmac("sha256", key).update("homarr-keyed-fingerprint-v1").digest();
  let disposed = false;
  const assertOpen = () => {
    if (disposed) throw new IntegrationBindingError("credential-codec");
  };
  const fingerprint = (value: string) => {
    assertOpen();
    return createHmac("sha256", fingerprintKey).update(value).digest("hex");
  };

  return {
    encryptSecret(value) {
      assertOpen();
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-cbc", key, iv);
      const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
      return `${encrypted.toString("hex")}.${iv.toString("hex")}`;
    },
    decryptSecret(value) {
      assertOpen();
      const [ciphertext, iv, excess] = value.split(".");
      if (
        !ciphertext ||
        !iv ||
        excess !== undefined ||
        !/^(?:[a-fA-F0-9]{32})+$/.test(ciphertext) ||
        !/^[a-fA-F0-9]{32}$/.test(iv)
      ) {
        throw new IntegrationBindingError("credential-codec");
      }
      const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
      try {
        return Buffer.concat([decipher.update(Buffer.from(ciphertext, "hex")), decipher.final()]).toString();
      } catch {
        throw new IntegrationBindingError("credential-codec");
      }
    },
    fingerprint,
    verifyFingerprint(value, candidate) {
      assertOpen();
      if (!/^[a-fA-F0-9]{64}$/.test(candidate)) return false;
      return timingSafeEqual(Buffer.from(fingerprint(value), "hex"), Buffer.from(candidate, "hex"));
    },
    dispose() {
      disposed = true;
      key.fill(0);
      fingerprintKey.fill(0);
    },
  };
};
