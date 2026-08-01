export const everyBeszelIntegrationFailed = (results: readonly unknown[]) =>
  results.length > 0 &&
  results.every(
    (result) => typeof result === "object" && result !== null && "error" in result && result.error !== undefined,
  );
