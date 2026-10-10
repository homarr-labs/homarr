import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type EncryptedSecret = `${string}.${string}`;

export interface SecretCodec {
  encryptSecret(text: string): EncryptedSecret;
  decryptSecret(value: EncryptedSecret): string;
  createKeyedFingerprint(value: string): string;
  verifyKeyedFingerprint(value: string, fingerprint: string): boolean;
}

export class SecretCodecError extends Error {
  constructor() {
    super("Secret codec operation failed");
    this.name = "SecretCodecError";
  }
}

export function createSecretCodec(encryptionKey: string): SecretCodec {
  if (!/^[a-f\d]{64}$/iu.test(encryptionKey) || /^0{64}$/u.test(encryptionKey)) {
    throw new SecretCodecError();
  }
  const key = Buffer.from(encryptionKey, "hex");
  const fingerprintKey = createHmac("sha256", key).update("homarr-keyed-fingerprint-v1").digest();
  const createKeyedFingerprint = (value: string) => createHmac("sha256", fingerprintKey).update(value).digest("hex");
  return {
    encryptSecret(text) {
      const initializationVector = randomBytes(16);
      const cipher = createCipheriv("aes-256-cbc", key, initializationVector);
      const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
      return `${encrypted.toString("hex")}.${initializationVector.toString("hex")}`;
    },
    decryptSecret(value) {
      const match = /^([a-f\d]+)\.([a-f\d]{32})$/iu.exec(value);
      const data = match?.[1];
      const dataIv = match?.[2];
      if (!data || !dataIv || data.length % 32 !== 0) throw new SecretCodecError();
      try {
        const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(dataIv, "hex"));
        return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString();
      } catch {
        throw new SecretCodecError();
      }
    },
    createKeyedFingerprint,
    verifyKeyedFingerprint(value, fingerprint) {
      if (!/^[a-f\d]{64}$/iu.test(fingerprint)) return false;
      return timingSafeEqual(Buffer.from(createKeyedFingerprint(value), "hex"), Buffer.from(fingerprint, "hex"));
    },
  };
}
