export const AUTH_HANDLERS: Record<string, (headers: Headers, url: URL, apiKey: string, headerName?: string) => void> =
  {
    bearer: (headers, _url, apiKey) => {
      headers.set("Authorization", `Bearer ${apiKey}`);
    },
    apiKeyHeader: (headers, _url, apiKey, headerName) => {
      headers.set(headerName ?? "X-API-Key", apiKey);
    },
    apiKeyQuery: (_headers, url, apiKey, headerName) => {
      url.searchParams.set(headerName ?? "api_key", apiKey);
    },
  };

export function buildSecretMap(secrets: Array<{ kind: string; value: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const secret of secrets) {
    map[secret.kind] = secret.value;
  }
  return map;
}

export function applyAuth(
  headers: Headers,
  url: URL,
  authType: string,
  secrets: Array<{ kind: string; value: string }>,
  headerName?: string | null,
): void {
  const secretMap = buildSecretMap(secrets);

  if (authType === "basic" && secretMap.username && secretMap.password) {
    const credentials = Buffer.from(`${secretMap.username}:${secretMap.password}`).toString("base64");
    headers.set("Authorization", `Basic ${credentials}`);
    return;
  }

  const handler = AUTH_HANDLERS[authType];
  if (handler && secretMap.apiKey) {
    handler(headers, url, secretMap.apiKey, headerName ?? undefined);
  }
}
