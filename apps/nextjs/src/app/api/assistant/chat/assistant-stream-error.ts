const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const getStatusCode = (error: unknown): number | undefined => {
  const record = asRecord(error);
  if (!record) return undefined;
  const statusCode =
    typeof record.statusCode === "number"
      ? record.statusCode
      : typeof record.status === "number"
        ? record.status
        : undefined;
  if (statusCode !== undefined) return statusCode;
  return getStatusCode(record.cause) ?? getStatusCode(record.response);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.message} ${getErrorMessage(error.cause)}`.trim();
  }
  const record = asRecord(error);
  if (!record) return typeof error === "string" ? error : "";
  const responseBody = typeof record.responseBody === "string" ? record.responseBody : "";
  const message = typeof record.message === "string" ? record.message : "";
  return `${message} ${responseBody} ${getErrorMessage(record.cause)}`.trim();
};

export const getAssistantStreamErrorMessage = (error: unknown) => {
  const statusCode = getStatusCode(error);
  const message = getErrorMessage(error);

  if (/AI_InvalidToolInputError|Invalid input for tool|\bError in input stream\b/iu.test(message)) {
    return "The model produced incomplete tool input, so Homarr did not run the action. Try again; multiline custom-widget JSX will be sent as templateLines.";
  }
  if (
    /\bmodel(?:\s+id)?\b/iu.test(message) &&
    /\b(invalid|unknown|unavailable|not found|not a valid)\b/iu.test(message)
  ) {
    return "The provider rejected the selected model. Ask an administrator to select a valid model ID.";
  }
  if (statusCode === 400) {
    return "The provider rejected the request. The selected model may not support the requested input or tools.";
  }
  if (statusCode === 401 || statusCode === 403) {
    return "The provider rejected the configured credentials. Ask an administrator to update the API key.";
  }
  if (statusCode === 402) {
    return "The provider account has insufficient credits for this request.";
  }
  if (statusCode === 404) {
    return "The selected model or chat endpoint was not found. Ask an administrator to verify the model and API URL.";
  }
  if (statusCode === 408 || statusCode === 504 || /\b(timeout|timed out)\b/iu.test(message)) {
    return "The model endpoint took too long to respond. Try again.";
  }
  if (statusCode === 429) {
    return "The model endpoint is rate limited. Wait a moment and try again.";
  }
  if (statusCode !== undefined && statusCode >= 500) {
    return "The model provider is temporarily unavailable. Try again later.";
  }

  return "The model endpoint stopped the response. Try again, or ask an administrator to verify its URL, model, and credentials.";
};
