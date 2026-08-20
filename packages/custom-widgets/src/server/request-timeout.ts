const TIMEOUT_ERROR_CODES = new Set(["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);

export function isCustomWidgetRequestTimeoutError(error: unknown, ...signals: readonly AbortSignal[]): boolean {
  if (signals.some((signal) => signal.aborted)) return true;
  if (!(error instanceof Error)) return false;
  if (error.name.includes("Timeout")) return true;
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return code !== undefined && TIMEOUT_ERROR_CODES.has(code);
}
