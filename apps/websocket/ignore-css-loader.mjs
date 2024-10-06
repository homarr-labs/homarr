/*
 * This loader is only used in dev to ignore CSS imports.
 */
export function load(url, context, defaultLoad) {
  if (url.endsWith(".css")) {
    return {
      format: "module",
      source: "export default {};",
      shortCircuit: true, // We want to early return here
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
