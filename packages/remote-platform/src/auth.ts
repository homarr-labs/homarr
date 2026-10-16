import type { PlatformUser } from "./types";

/** Reuses the Workshop's existing `users` collection and configured GitHub provider. */
export interface WorkshopAuth {
  workshopApiUrl: string;
  authenticate(token: string): Promise<Omit<PlatformUser, "id">>;
}

export function pocketBaseWorkshopAuth(options: { apiUrl: string; fetch?: typeof fetch }): WorkshopAuth {
  const url = new URL(options.apiUrl);
  if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("WORKSHOP_API_URL must be an HTTP(S) URL without credentials, query, or fragment");
  }
  if (url.protocol !== "https:" && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("WORKSHOP_API_URL requires HTTPS outside loopback");
  }
  const apiUrl = url.toString().replace(/\/$/, "");
  const request = options.fetch ?? fetch;
  return {
    workshopApiUrl: apiUrl,
    async authenticate(token) {
      if (token.length < 20 || token.length > 8192 || /\s/.test(token)) throw new Error("Invalid Workshop token");
      const response = await request(`${apiUrl}/api/collections/users/auth-refresh`, {
        method: "POST",
        headers: { Authorization: token, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("The Workshop session is invalid or expired");
      const result = (await response.json()) as { record?: { id?: unknown; collectionName?: unknown; name?: unknown } };
      const user = result.record;
      if (
        !user ||
        typeof user.id !== "string" ||
        !/^[a-zA-Z0-9]{15}$/.test(user.id) ||
        user.collectionName !== "users" ||
        typeof user.name !== "string" ||
        !user.name.trim()
      ) {
        throw new Error("The Workshop returned an invalid users record");
      }
      // `name` is the Workshop's existing GitHub username mapping. Only the immutable PB ID is identity.
      const name = user.name.slice(0, 100);
      return { workshopId: user.id, login: name, name, avatarUrl: null };
    },
  };
}
