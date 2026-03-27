/**
 * Sanitizes the URL from malicious payloads.
 * Prevents open redirects such as //example.com/path
 * and prevents XSS such as javascript:().
 * Returns / as a default or when unsafe.
 * @param url The URL to sanitize
 */
export const sanitizeRedirectionUrl = (url?: string) => {
  if (url && url.startsWith("/") && !url.startsWith("//")) {
    return url;
  } else {
    return "/"; // Safe default
  }
};
