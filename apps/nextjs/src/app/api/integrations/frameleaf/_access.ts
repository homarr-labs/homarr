import { cookies } from "next/headers";

import { getIntegrationsWithPermissionsAsync, getSessionFromToken, sessionTokenCookieName } from "@homarr/auth/server";
import { db } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  FrameleafConnectionError,
  frameleafCallbackPath,
  validateFrameleafCallback,
} from "@homarr/integrations/frameleaf";

import { env } from "~/env";

const logger = createLogger({ module: "frameleaf" });

export const frameleafCookie = "__Secure-homarr-frameleaf-pending";
export async function requireFrameleafSessionAsync() {
  const matching = (await cookies()).getAll(sessionTokenCookieName);
  const token = matching.length === 1 ? matching[0]?.value : undefined;
  const session = await getSessionFromToken(db, token);
  if (!session || !token) throw new FrameleafConnectionError("consent");
  return { session, token };
}
export async function requireFrameleafManagementAsync(id?: string) {
  const context = await requireFrameleafSessionAsync();
  if (id) {
    const integrations = await getIntegrationsWithPermissionsAsync(context.session);
    if (!integrations.find((integration) => integration.id === id)?.permissions.hasFullAccess)
      throw new FrameleafConnectionError("consent");
  } else if (!context.session.user.permissions.includes("integration-create"))
    throw new FrameleafConnectionError("consent");
  return context;
}
export function frameleafCallback() {
  if (!env.BASE_URL) throw new FrameleafConnectionError("configuration");
  return validateFrameleafCallback(`${env.BASE_URL}${frameleafCallbackPath}`);
}
export function requireFrameleafOrigin(request: Request) {
  const expected = new URL(frameleafCallback()).origin;
  if (
    request.headers.get("origin") !== expected ||
    ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
  )
    throw new FrameleafConnectionError("consent");
}
export const frameleafResponseHeaders = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
};
export function frameleafError(error: unknown) {
  const reason = error instanceof FrameleafConnectionError ? error.reason : "unavailable";
  logger.warn("Frameleaf request failed", { reason });
  return Response.json(
    { error: reason },
    {
      status: reason === "consent" ? 403 : reason === "busy" ? 409 : reason === "rateLimit" ? 429 : 400,
      headers: {
        ...frameleafResponseHeaders,
        ...(error instanceof FrameleafConnectionError && error.retryAfter
          ? { "Retry-After": String(error.retryAfter) }
          : {}),
      },
    },
  );
}
