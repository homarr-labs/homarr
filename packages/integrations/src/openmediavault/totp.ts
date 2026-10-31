import { createHmac } from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpDigits = 6;
const totpPeriodSeconds = 30;
/** 80 bits. Shorter values are treated as a truncated paste, including a 6-digit code. */
const minimumSecretLength = 16;

export class InvalidTotpSecretError extends Error {
  constructor() {
    super("OpenMediaVault TOTP secret must be the Base32 shared secret from 2FA enrollment, not a 6-digit code.");
    this.name = "InvalidTotpSecretError";
  }
}

/**
 * Accept the Base32 shared secret from OpenMediaVault enrollment.
 * Spaces, hyphens and padding are ignored. A 6-digit authenticator code is rejected.
 */
export const normalizeTotpSecret = (secret: string): string => {
  const compact = secret.trim().replace(/[\s-]/g, "");
  if (/^\d{6}$/.test(compact)) {
    throw new InvalidTotpSecretError();
  }

  const unpadded = compact.replace(/=+$/u, "").toUpperCase();
  if (!/^[A-Z2-7]+$/.test(unpadded) || unpadded.length < minimumSecretLength) {
    throw new InvalidTotpSecretError();
  }

  decodeBase32(unpadded);
  return unpadded;
};

/** RFC 6238 TOTP: HMAC-SHA1, 6 digits, 30 second step. Matches OpenMediaVault. */
export const generateTotpCode = (secret: string, timestampMs = Date.now()): string => {
  const key = decodeBase32(normalizeTotpSecret(secret));
  const counter = Math.floor(timestampMs / 1000 / totpPeriodSeconds);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(counterBytes).digest();
  const lastByte = hmac[hmac.length - 1];
  const firstByte = hmac[0];
  if (lastByte === undefined || firstByte === undefined) {
    throw new InvalidTotpSecretError();
  }

  const offset = lastByte & 0x0f;
  const [first, second, third, fourth] = hmac.subarray(offset, offset + 4);
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
    throw new InvalidTotpSecretError();
  }

  const binary = ((first & 0x7f) << 24) | ((second & 0xff) << 16) | ((third & 0xff) << 8) | (fourth & 0xff);

  return (binary % 10 ** totpDigits).toString().padStart(totpDigits, "0");
};

const decodeBase32 = (encoded: string): Buffer => {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of encoded) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new InvalidTotpSecretError();

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
      value &= (1 << bits) - 1;
    }
  }

  if (bytes.length === 0) throw new InvalidTotpSecretError();
  return Buffer.from(bytes);
};
