import { getSessionFromRequestAsync } from "@homarr/auth/http";
import { getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import { localeCookieKey } from "@homarr/definitions/cookie";
import { getHttpMessageAsync } from "@homarr/translation/http";

import { readMcpConsent } from "./_grant";
import { browserBinding, currentConsentSession, finishAuthorization, localRedirect, uniqueCookie } from "./_http";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const displayText = (value: string) =>
  escapeHtml(
    value.replace(
      /[\p{Cc}\p{Zl}\p{Zp}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu,
      (character) => `[U+${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}]`,
    ),
  );

const htmlResponse = (request: Request, title: string, content: string, pendingId: string | null = null) => {
  const response = finishAuthorization(
    new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font:16px system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#202124}dt{font-weight:600}dd{margin:0 0 1rem;overflow-wrap:anywhere}button{font:inherit;padding:.7rem 1.2rem;margin:.5rem .5rem .5rem 0;cursor:pointer}.warning{border:2px solid #a32626;padding:1rem}h1{line-height:1.2}</style></head><body><main>${content}</main></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" } },
    ),
    request,
    pendingId,
  );
  // Browsers apply form-action to the client callback reached by the POST redirect.
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' http: https:",
  );
  response.headers.set("Referrer-Policy", "strict-origin");
  return response;
};

const consentMessage = (request: Request, key: string) =>
  getHttpMessageAsync(uniqueCookie(request, localeCookieKey) ?? undefined, `user.page.mcpConsent.${key}`);

const problemResponse = async (request: Request, reason: string, pendingId: string | null = null) => {
  const [title, description, freshStart] = await Promise.all([
    consentMessage(request, `error.${reason}.title`),
    consentMessage(request, `error.${reason}.description`),
    consentMessage(request, "error.freshStart"),
  ]);
  return htmlResponse(
    request,
    escapeHtml(title),
    `<h1>${escapeHtml(title)}</h1><p role="alert">${escapeHtml(description)}</p><p>${escapeHtml(freshStart)}</p>`,
    pendingId,
  );
};

export async function getMcpConsentErrorResponse(request: Request) {
  const reason = new URL(request.url).searchParams.get("reason");
  if (reason === "access_denied" || reason === "server_error" || reason === "invalid_request")
    return problemResponse(request, reason);
  return problemResponse(request, "unknown");
}

/** The dashboard renders this state while authorization remains in the backend process. */
export async function getMcpConsentStateResponse(request: Request) {
  const pendingIds = new URL(request.url).searchParams.getAll("pending");
  const pendingId = pendingIds[0] ?? "";
  if (pendingIds.length !== 1 || !/^[a-f0-9]{32}$/.test(pendingId)) {
    return finishAuthorization(Response.json({ ok: false, error: "unavailable" }), request);
  }
  const result = readMcpConsent({
    pendingId,
    browserBinding: browserBinding(request, pendingId),
    session: await currentConsentSession(request),
  });
  return finishAuthorization(Response.json(result), request, pendingId);
}

/** Browser consent owned by the backend, available without a dashboard process. */
export async function getMcpConsentResponse(request: Request) {
  const pendingIds = new URL(request.url).searchParams.getAll("pending");
  const pendingId = pendingIds[0];
  if (pendingIds.length !== 1 || !pendingId || !/^[a-f0-9]{32}$/.test(pendingId))
    return problemResponse(request, "invalid_request");

  const [consentSession, session] = await Promise.all([
    currentConsentSession(request),
    getSessionFromRequestAsync(request),
  ]);
  const result = readMcpConsent({
    pendingId,
    browserBinding: browserBinding(request, pendingId),
    session: consentSession,
  });
  if (!result.ok) {
    if (result.error === "login_required") {
      const callbackUrl = `/api/mcp/oauth/authorize?pending=${pendingId}`;
      return finishAuthorization(
        localRedirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`),
        request,
        pendingId,
      );
    }
    return problemResponse(request, result.error, pendingId);
  }
  if (!session) return problemResponse(request, "session_changed", pendingId);

  const keys = [
    "title",
    "description",
    "viewingHint",
    "account.name",
    "account.id",
    "account.nameNotRecorded",
    "client.name",
    "client.id",
    "client.callbackHost",
    "client.callbackUrl",
    "client.unverifiedHint",
    "client.destinationHint",
    "access.title",
    "access.description",
    "access.noGlobalPermissions",
    "admin.title",
    "admin.description",
    "credential.breadth",
    "credential.lifetime",
    "requestExpires",
    "decisionHint",
    "deny",
    "allow",
  ];
  const labels = new Map(
    await Promise.all(keys.map(async (key) => [key, escapeHtml(await consentMessage(request, key))] as const)),
  );
  const t = (key: string) => labels.get(key) ?? escapeHtml(key);
  const { consent } = result;
  const effectivePermissions = new Set(getPermissionsWithChildren(session.user.permissions));
  const displayedPermissions = groupPermissionKeys.filter((permission) => effectivePermissions.has(permission));
  const permissions = await Promise.all(
    displayedPermissions.map(async (permission) => {
      const [area, ...parts] = permission.split("-");
      let permissionPath = `${area}.item.${parts.join("-")}.label`;
      if (permission.startsWith("search-engine-"))
        permissionPath = `search-engine.item.${permission.slice("search-engine-".length)}.label`;
      if (permission === "admin") permissionPath = "admin.item.admin.label";
      const label = await getHttpMessageAsync(
        uniqueCookie(request, localeCookieKey) ?? undefined,
        `group.permission.${permissionPath}`,
      );
      return `<li>${escapeHtml(label)}</li>`;
    }),
  );
  let access = `<h2>${t("access.title")}</h2><p>${t("access.noGlobalPermissions")}</p>`;
  if (displayedPermissions.length > 0)
    access = `<h2>${t("access.title")}</h2><p>${t("access.description")}</p><ul>${permissions.join("")}</ul>`;
  if (effectivePermissions.has("admin"))
    access = `<section class="warning" role="alert"><h2>${t("admin.title")}</h2><p>${t("admin.description")}</p></section>`;

  return htmlResponse(
    request,
    t("title"),
    `
    <h1>${t("title")}</h1><p>${t("description")}</p><p>${t("viewingHint")}</p>
    <dl>
      <dt>${t("account.name")}</dt><dd><bdi>${displayText(session.user.name ?? "") || t("account.nameNotRecorded")}</bdi></dd>
      <dt>${t("account.id")}</dt><dd><bdi dir="ltr">${displayText(session.user.id)}</bdi></dd>
      <dt>${t("client.name")}</dt><dd><bdi>${displayText(consent.clientName)}</bdi></dd>
      <dt>${t("client.id")}</dt><dd><bdi dir="ltr">${displayText(consent.clientId)}</bdi></dd>
      <dt>${t("client.callbackHost")}</dt><dd><bdi dir="ltr">${displayText(new URL(consent.redirectUri).host)}</bdi></dd>
      <dt>${t("client.callbackUrl")}</dt><dd><bdi dir="ltr">${displayText(consent.redirectUri)}</bdi></dd>
    </dl>
    <p>${t("client.unverifiedHint")}</p><p>${t("client.destinationHint")}</p>${access}
    <p>${t("credential.breadth")}</p><p>${t("credential.lifetime")}</p>
    <p>${t("requestExpires")} <time datetime="${new Date(consent.expiresAt).toISOString()}">${new Date(consent.expiresAt).toUTCString()}</time></p>
    <form method="post" action="/api/mcp/oauth/authorize" aria-describedby="decision-hint">
      <input type="hidden" name="pending" value="${escapeHtml(consent.pendingId)}">
      <input type="hidden" name="consentToken" value="${escapeHtml(consent.consentToken)}">
      <p id="decision-hint">${t("decisionHint")}</p>
      <button type="submit" name="decision" value="deny">${t("deny")}</button>
      <button type="submit" name="decision" value="approve">${t("allow")}</button>
    </form>`,
    pendingId,
  );
}
