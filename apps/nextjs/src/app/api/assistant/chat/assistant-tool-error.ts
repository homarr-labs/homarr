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

export const getSafeAssistantToolError = (error: unknown) => {
  const chain = getErrorChain(error);
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
      return "The tool input was not valid.";
    case "PRECONDITION_FAILED":
      return "The requested resource is not ready for this operation. Check its configuration and try again.";
    case "TOO_MANY_REQUESTS":
      return "The operation is rate limited. Try again later.";
  }
  return "The Homarr tool could not complete this request.";
};
