const asErrorRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const getErrorChain = (error: unknown) => {
  const chain: Record<string, unknown>[] = [];
  let current = asErrorRecord(error);
  while (current && chain.length < 8 && !chain.includes(current)) {
    chain.push(current);
    current = asErrorRecord(current.cause);
  }
  return chain;
};

const sanitizeValidationText = (value: string) =>
  value
    .replace(/https?:\/\/\S+/giu, "[URL]")
    .replace(/\b(Bearer|Basic)\s+\S+/giu, "$1 [REDACTED]")
    .replace(/\b(api[_ -]?key|authorization|password|token)\s*[:=]\s*\S+/giu, "$1=[REDACTED]")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 240);

const getCustomWidgetValidationDetails = (chain: Record<string, unknown>[]) => {
  const details = chain
    .flatMap((candidate) => (Array.isArray(candidate.issues) ? candidate.issues : []))
    .flatMap((issue) => {
      const record = asErrorRecord(issue);
      if (!record || typeof record.message !== "string") return [];
      const path = Array.isArray(record.path)
        ? record.path
            .filter((segment): segment is string | number => typeof segment === "string" || typeof segment === "number")
            .map(String)
            .join(".")
        : "";
      const message = sanitizeValidationText(record.message);
      return message ? [`${path || "widget"}: ${message}`] : [];
    })
    .slice(0, 6);
  if (details.length > 0) return details.join("; ");

  const safeMessage = chain
    .map((candidate) => (typeof candidate.message === "string" ? sanitizeValidationText(candidate.message) : ""))
    .find(
      (message) =>
        message.length > 0 &&
        !["BAD_REQUEST", "Invalid input", "Invalid request parameters"].includes(message) &&
        !message.startsWith("[") &&
        !message.startsWith("{"),
    );
  return safeMessage;
};

export const getSafeAssistantToolError = (error: unknown, options?: { toolName?: string }) => {
  const chain = getErrorChain(error);
  const isCustomWidgetTool = options?.toolName?.startsWith("customWidget_") === true;
  if (
    chain.some(
      (candidate) =>
        candidate.code === "ERR_OSSL_BAD_DECRYPT" ||
        (typeof candidate.message === "string" && /bad decrypt|unable to decrypt/iu.test(candidate.message)),
    )
  ) {
    return "Homarr could not read this integration's saved credentials. Re-save the integration credentials in Management, then try again.";
  }

  const code = chain.find((candidate) => typeof candidate.code === "string")?.code;
  switch (code) {
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "You do not have permission to perform this action.";
    case "NOT_FOUND":
      return "The requested resource was not found or is not compatible with this tool.";
    case "BAD_REQUEST":
      if (isCustomWidgetTool) {
        const details = getCustomWidgetValidationDetails(chain);
        if (details) return `The custom widget input was invalid: ${details}`;
      }
      return "The tool input was not valid.";
    case "BAD_GATEWAY":
      if (isCustomWidgetTool) {
        const details = getCustomWidgetValidationDetails(chain);
        return details
          ? `The custom widget data source could not complete the preview request: ${details}`
          : "The custom widget data source could not complete the preview request.";
      }
      break;
    case "PAYLOAD_TOO_LARGE":
      if (isCustomWidgetTool) {
        const details = getCustomWidgetValidationDetails(chain);
        return details
          ? `The custom widget preview exceeded a safety limit: ${details}`
          : "The custom widget preview exceeded a response or request size safety limit.";
      }
      break;
    case "CONFLICT":
      if (isCustomWidgetTool) {
        const details = getCustomWidgetValidationDetails(chain);
        return details
          ? `The custom widget preview changed while this request was running: ${details}`
          : "The custom widget preview changed while this request was running. Retry the preview step.";
      }
      break;
    case "PRECONDITION_FAILED":
      return "The requested resource is not ready for this operation. Check its configuration and try again.";
    case "TOO_MANY_REQUESTS":
      return "The operation is rate limited. Try again later.";
  }
  return "The Homarr tool could not complete this request.";
};
