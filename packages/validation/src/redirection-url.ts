/**
 * Sanitizes the URL from malicious payloads.
 * Prevents open redirects such as //example.com/path
 * and prevents XSS such as javascript:().
 * Returns / as a default or when unsafe.
 * @param url The URL to sanitize
 */
export const sanitizeRedirectionUrl = (url?: string) => {
  if (!url?.startsWith("/") || url.startsWith("//")) return "/";

  try {
    // URL parsing also handles backslashes and embedded control characters.
    const base = "https://homarr.invalid";
    const target = new URL(url, base);
    if (target.origin === base && !target.pathname.startsWith("//")) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    // Invalid targets use the same safe default as external URLs.
  }

  return "/";
};
