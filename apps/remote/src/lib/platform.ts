import { appUrl } from "./base-path";
import type { PlatformSession } from "@homarr/remote-platform/types";

export class PlatformError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function platformRequest<T>(
  path: string,
  session?: PlatformSession | null,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.csrfToken) headers.set("X-CSRF-Token", session.csrfToken);
  const response = await fetch(appUrl(path), { ...init, headers, credentials: "same-origin", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    let message = `The account service returned ${response.status}.`;
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error;
    throw new PlatformError(message, response.status);
  }
  return body as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function expiryLabel(value: number | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (date.getTime() < Date.now()) return "Expired";
  return `Expires ${date.toLocaleString()}`;
}
