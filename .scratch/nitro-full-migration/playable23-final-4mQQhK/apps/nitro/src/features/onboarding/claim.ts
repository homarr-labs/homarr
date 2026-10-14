export type ClaimResult =
  | { kind: "ready"; expiresAt: number }
  | { kind: "locked"; expiresAt?: number }
  | { kind: "signIn" }
  | { kind: "finished" }
  | { kind: "error" };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expiry(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export async function claimOnboarding(signal: AbortSignal): Promise<ClaimResult> {
  const response = await fetch("/api/onboarding/claim", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!record(body)) return { kind: "error" };
  const expiresAt = expiry(body.expiresAt);
  if (response.ok) {
    if ((body.status !== "issued" && body.status !== "active") || !expiresAt || expiresAt <= Date.now()) {
      return { kind: "error" };
    }
    return { kind: "ready", expiresAt };
  }
  if (body.code === "locked") return { kind: "locked", expiresAt };
  if (body.code === "administrator_required") return { kind: "signIn" };
  if (body.code === "finished") return { kind: "finished" };
  return { kind: "error" };
}
