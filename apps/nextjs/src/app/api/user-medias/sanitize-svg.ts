// Fallback SVG sanitizer — not currently used (isomorphic-dompurify is preferred).
// Kept here for potential reuse if the dependency is ever removed.
// See: https://github.com/homarr-labs/homarr/pull/5562#discussion_r3174871120
export function sanitizeSvg(svg: string): string {
  let sanitized = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  sanitized = sanitized.replace(/(?:href|xlink:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "");
  sanitized = sanitized.replace(/(?:href|xlink:href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, "");
  sanitized = sanitized.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  sanitized = sanitized.replace(/<use[^>]+(?:href|xlink:href)\s*=\s*(?:"[^#][^"]*"|'[^#][^']*')[^>]*\/?>/gi, "");

  return sanitized;
}
