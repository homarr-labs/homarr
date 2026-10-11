import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import { env } from "../env";

export type RequestIdentity =
  | Readonly<{ source: "trusted-proxy"; address: string; key: string }>
  | Readonly<{ source: "unattributed"; address: null; key: "unattributed" }>;

const identities = new WeakMap<Headers, RequestIdentity>();
const unattributed: RequestIdentity = Object.freeze({ source: "unattributed", address: null, key: "unattributed" });

function normalizedAddress(value: string | null) {
  if (!value || value.length > 45 || !/^[0-9a-fA-F:.]+$/.test(value)) return null;
  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) return null;
  const address = new URL(`http://[${value}]`).hostname.slice(1, -1);
  const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(address);
  if (!mapped) return address;
  const high = Number.parseInt(mapped[1] ?? "", 16);
  const low = Number.parseInt(mapped[2] ?? "", 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function resolveRequestIdentity(headers: Headers): RequestIdentity {
  const previous = identities.get(headers);
  if (previous) return previous;
  const secret = env.HOMARR_REQUEST_IDENTITY_SECRET;
  const supplied = headers.get("x-homarr-proxy-secret");
  const address =
    secret &&
    /^[a-fA-F0-9]{64}$/.test(secret) &&
    supplied &&
    /^[a-fA-F0-9]{64}$/.test(supplied) &&
    timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
      ? normalizedAddress(headers.get("x-homarr-client-ip"))
      : null;
  const identity: RequestIdentity = address
    ? Object.freeze({ source: "trusted-proxy", address, key: `ip:${address}` })
    : unattributed;
  identities.set(headers, identity);
  return identity;
}
