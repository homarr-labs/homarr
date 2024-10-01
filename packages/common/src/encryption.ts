import crypto from "crypto";

import { logger } from "@homarr/log";

const algorithm = "aes-256-cbc"; //Using AES encryption
const fallbackKey = "0000000000000000000000000000000000000000000000000000000000000000";
const encryptionKey = process.env.ENCRYPTION_KEY ?? fallbackKey; // Fallback to a default key for local development
if (encryptionKey === fallbackKey) {
  logger.warn("Using a fallback encryption key, stored secrets are not secure");

  // We never want to use the fallback key in production
  if (process.env.NODE_ENV === "production" && process.env.CI !== "true") {
    throw new Error("Encryption key is not set");
  }
}

const key = Buffer.from(encryptionKey, "hex");

export function encryptSecret(text: string): `${string}.${string}` {
  const initializationVector = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), initializationVector);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString("hex")}.${initializationVector.toString("hex")}`;
}

export function decryptSecret(value: `${string}.${string}`) {
  const [data, dataIv] = value.split(".") as [string, string];
  const initializationVector = Buffer.from(dataIv, "hex");
  const encryptedText = Buffer.from(data, "hex");
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), initializationVector);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
