import crypto from "crypto";

const algorithm = "aes-256-cbc"; //Using AES encryption
const key = Buffer.from("1d71cceced68159ba59a277d056a66173613052cbeeccbfbd15ab1c909455a4d", "hex"); // TODO: generate with const data = crypto.randomBytes(32).toString('hex')

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
