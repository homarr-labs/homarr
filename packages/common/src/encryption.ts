import crypto from "crypto";

const algorithm = "aes-256-cbc"; //Using AES encryption
const encryptonKey = process.env.ENCRYPTION_KEY ?? "0000000000000000000000000000000000000000000000000000000000000000"; // Fallback to a default key for local development
const key = Buffer.from(encryptonKey, "hex");

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
