import { z } from "zod/v4";

// `appHrefSchema` accepts:
//   - empty string -> null
//   - absolute URL with http/https scheme (or any non-javascript scheme)
//   - path-only URL starting with "/" followed by a non-"/" character
//
// Path-only hrefs are resolved against the current origin in the browser, and
// against the request origin server-side via `resolveServerUrl`. This lets a
// single dashboard work across multiple hostnames (mDNS, VPN FQDN, DHCP DNS).
//
// Rejects: javascript: scheme, protocol-relative ("//host/..."), single-slash
// root ("/"), bare strings without scheme or leading slash.
const absoluteHrefSchema = z
  .string()
  .trim()
  .url()
  .regex(/^(?!javascript)[a-zA-Z]*:\/\//i);

// Disallowed characters anywhere in a path-only href:
//   - "/" past the leading position would either produce protocol-relative
//     "//host" (already rejected outright) or run-on slashes "/foo//bar"
//     (cosmetic, also rejected for consistency).
//   - "\" — WHATWG URL parser normalizes backslash to forward slash for
//     http(s), so "/\evil.example.com" rendered into <a href> navigates
//     cross-origin. JS regex \s does not catch this; explicit reject.
//   - JS \s whitespace.
//   - C0 / C1 control bytes (U+0000-U+001F, U+007F-U+009F) — invisible in
//     admin UI, may survive into the DOM.
//   - Bidi / zero-width / formatting characters (U+200B-U+200F, U+2028-U+202F,
//     U+2066-U+2069, U+FEFF). These bypass `\s` and enable display-spoofing
//     in the rendered sub-label without affecting the resolved navigation
//     target — admin-confusion / phishing of secondary navigation.
const PATH_DISALLOWED = "\\\\\\s\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF";

const pathOnlyHrefSchema = z
  .string()
  .trim()
  // Leading "/" followed by at least one non-"/" / non-disallowed char,
  // then any mix of allowed chars (including "/" for internal segments).
  .regex(new RegExp(`^/[^/${PATH_DISALLOWED}][^${PATH_DISALLOWED}]*$`))
  // Reject consecutive slashes anywhere ("/foo//bar"). Cosmetic on its own
  // but keeps the rendered sub-label canonical and matches the leading-"/"
  // exclusion of "//host/...".
  .refine((s) => !s.includes("//"), { message: "consecutive slashes are not allowed" });

export const appHrefSchema = absoluteHrefSchema
  .or(pathOnlyHrefSchema)
  .or(z.literal(""))
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const appManageSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z
    .string()
    .trim()
    .max(512)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  iconUrl: z.string().trim().min(1),
  href: appHrefSchema,
  pingUrl: z
    .string()
    .trim()
    .url()
    .regex(/^https?:\/\//) // Only allow http and https for security reasons (javascript: is not allowed)
    .or(z.literal(""))
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

export const appCreateManySchema = z
  .array(appManageSchema.omit({ iconUrl: true }).and(z.object({ iconUrl: z.string().min(1).nullable() })))
  .min(1);

export const appEditSchema = appManageSchema.and(z.object({ id: z.string() }));
