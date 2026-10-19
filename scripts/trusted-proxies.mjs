import { isIP } from "node:net";

const configured = process.env.HOMARR_TRUSTED_PROXIES;
const proxies = configured?.trim() ? configured.split(",").map((value) => value.trim()) : [];

for (const proxy of proxies) {
  const match = /^([0-9a-fA-F:.]+)(?:\/(\d{1,3}))?$/.exec(proxy);
  const address = match?.[1] ?? "";
  const version = isIP(address);
  const prefix = match?.[2] === undefined ? null : Number(match[2]);
  if (!version || (prefix !== null && (prefix < 1 || prefix > (version === 4 ? 32 : 128)))) {
    throw new Error("HOMARR_TRUSTED_PROXIES must contain comma-separated IP addresses or nonzero CIDRs");
  }
}

if (proxies.length) {
  process.stdout.write(
    [
      "real_ip_header X-Forwarded-For;",
      "real_ip_recursive on;",
      ...proxies.map((proxy) => `set_real_ip_from ${proxy};`),
    ].join("\n"),
  );
}
