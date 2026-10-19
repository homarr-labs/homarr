// SABnzbd/Jackett: apikey; Custom Widgets: api_key; Pi-hole v5: auth;
// Technitium: token/user/pass; Navidrome: u/p. Keep protocol selectors and actions.
const credentialQueryParameters = new Set(["apikey", "api_key", "auth", "token", "user", "pass", "u", "p"]);

/** Sanitizes a diagnostic copy; request URLs and responses stay unchanged. */
export function redactCredentialUrl(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return value;

  let url: URL;
  let absolute = false;
  try {
    url = new URL(value);
    absolute = true;
  } catch {
    try {
      url = new URL(value, "http://diagnostic.invalid");
    } catch {
      return undefined;
    }
  }

  let changed = false;
  if (url.username !== "" || url.password !== "") {
    url.username = "";
    url.password = "";
    changed = true;
  }
  for (const name of new Set(url.searchParams.keys())) {
    if (credentialQueryParameters.has(name.toLowerCase())) {
      url.searchParams.delete(name);
      changed = true;
    }
  }
  if (!changed) return value;

  const trimmed = value.trim();
  if (absolute) return url.toString();
  if (trimmed.slice(0, 2).replaceAll("\\", "/") === "//") {
    return `//${url.host}${url.pathname}${url.search}${url.hash}`;
  }
  const path = trimmed.split(/[?#]/, 1)[0] ?? "";
  return `${path}${url.search}${url.hash}`;
}
