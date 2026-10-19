import { getMcpBaseUrl } from "../../_base-url";
import { beginMcpAuthorization, decideMcpAuthorization, readMcpConsent } from "../_grant";
import {
  authorizationQuery,
  browserBinding,
  consentDecisionError,
  currentConsentSession,
  finishAuthorization,
  grantError,
  localRedirect,
  oauthError,
  parameterBody,
  validDecisionOrigin,
} from "../_http";

export async function GET(request: Request) {
  const params = authorizationQuery(request);
  if (!params.ok) return finishAuthorization(oauthError("invalid_request", "Invalid or duplicate parameters"), request);
  const session = await currentConsentSession(request);
  const pendingId = params.value.pending;
  if (pendingId !== undefined) {
    if (Object.keys(params.value).length !== 1)
      return finishAuthorization(oauthError("invalid_request", "Invalid resumption parameters"), request, pendingId);
    const result = readMcpConsent({ pendingId, browserBinding: browserBinding(request, pendingId), session });
    if (!result.ok && result.error !== "login_required")
      return finishAuthorization(
        oauthError(result.error, "Consent request expired or is unavailable for this browser and session"),
        request,
        pendingId,
      );
    const target = result.ok
      ? `/auth/mcp?pending=${pendingId}`
      : `/auth/login?callbackUrl=${encodeURIComponent(`/api/mcp/oauth/authorize?pending=${pendingId}`)}`;
    return finishAuthorization(localRedirect(target), request, pendingId);
  }
  const baseUrl = getMcpBaseUrl(request.headers);
  const result = beginMcpAuthorization(
    params.value,
    new Set([`${baseUrl}/api/mcp`, `${baseUrl}/api/mcp/mcp`]),
    session,
  );
  if (!result.ok) return finishAuthorization(grantError(result), request);
  const target = result.authenticated
    ? `/auth/mcp?pending=${result.pendingId}`
    : `/auth/login?callbackUrl=${encodeURIComponent(`/api/mcp/oauth/authorize?pending=${result.pendingId}`)}`;
  return finishAuthorization(localRedirect(target), request, result.pendingId, result);
}

export async function POST(request: Request) {
  let pendingId: string | null = null;
  try {
    if (!validDecisionOrigin(request))
      return finishAuthorization(
        consentDecisionError(request, "invalid_request", "A same-origin consent decision is required", 403),
        request,
      );
    const params = await parameterBody(request);
    if (!params.ok || Object.keys(params.value).some((key) => !["pending", "consentToken", "decision"].includes(key)))
      return finishAuthorization(
        consentDecisionError(request, "invalid_request", "Invalid or duplicate decision parameters"),
        request,
      );
    pendingId = params.value.pending ?? "";
    const session = await currentConsentSession(request);
    const result = decideMcpAuthorization(
      { pendingId, browserBinding: browserBinding(request, pendingId), session },
      params.value.consentToken ?? "",
      params.value.decision ?? "",
    );
    const response = result.ok
      ? new Response(null, { status: 303, headers: { Location: result.redirectUri } })
      : consentDecisionError(request, result.error, result.error_description, result.status);
    return finishAuthorization(response, request, pendingId);
  } catch {
    return finishAuthorization(
      consentDecisionError(request, "server_error", "Failed to complete consent decision", 500),
      request,
      pendingId,
    );
  }
}
