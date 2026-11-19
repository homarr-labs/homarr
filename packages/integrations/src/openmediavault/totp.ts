import { createHmac } from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export class InvalidTotpSecretError extends Error {
  constructor() {
    super("Use the Base32 shared secret from OpenMediaVault two-factor enrollment, not a 6-digit code.");
    this.name = "InvalidTotpSecretError";
  }
}

const decodeBase32 = (secret: string): Buffer => {
  const encoded = secret.trim().replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (encoded.length < 16 || !/^[A-Z2-7]+$/.test(encoded)) throw new InvalidTotpSecretError();

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of encoded) {
    value = (value << 5) | base32Alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
      value &= (1 << bits) - 1;
    }
  }
  if (value !== 0 || ![0, 2, 4, 5, 7].includes(encoded.length % 8)) throw new InvalidTotpSecretError();
  return Buffer.from(bytes);
};

export const generateTotpCode = (secret: string, timestampMs = Date.now()): string => {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timestampMs / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest.readUInt8(digest.length - 1) & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
};
