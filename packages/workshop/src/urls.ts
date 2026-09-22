export const HOMARR_WEBSITE_URL = "https://homarr.dev";
export const WORKSHOP_API_URL = HOMARR_WEBSITE_URL;
export const WORKSHOP_WEB_URL = `${HOMARR_WEBSITE_URL}/workshop`;

export interface HomarrUrlConfig {
  homarrWebsiteUrl: string;
  workshopApiUrl: string;
  workshopWebUrl: string;
}

export interface HomarrUrlConfigInput {
  homarrWebsiteUrl?: string;
  workshopApiUrl?: string;
  workshopWebUrl?: string;
}

export function normalizeHttpUrl(value: string, variableName: string): string {
  if (value !== value.trim() || hasAsciiControl(value)) {
    throw new Error(`${variableName} must not include surrounding whitespace or control characters`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid absolute HTTP(S) URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${variableName} must use HTTP or HTTPS`);
  }
  if (url.username || url.password) {
    throw new Error(`${variableName} must not include credentials`);
  }
  if (url.search || url.hash) {
    throw new Error(`${variableName} must not include a query string or fragment`);
  }

  return url.toString().replace(/\/+$/u, "");
}

function hasAsciiControl(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127;
  });
}

export function resolveHomarrUrlConfig(input: HomarrUrlConfigInput = {}): HomarrUrlConfig {
  const homarrWebsiteUrl = normalizeHttpUrl(input.homarrWebsiteUrl ?? HOMARR_WEBSITE_URL, "HOMARR_WEBSITE_URL");
  const workshopApiUrl = normalizeHttpUrl(input.workshopApiUrl ?? homarrWebsiteUrl, "WORKSHOP_API_URL");
  const workshopWebUrl = normalizeHttpUrl(input.workshopWebUrl ?? `${homarrWebsiteUrl}/workshop`, "WORKSHOP_WEB_URL");

  return { homarrWebsiteUrl, workshopApiUrl, workshopWebUrl };
}
