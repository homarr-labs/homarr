import { redeemMcpAuthorization } from "../_grant";
import { finishAuthorization, grantError, oauthError, parameterBody } from "../_http";
import { recordTokenFailure, tokenAllowed } from "../_rate-limit";

export async function POST(request: Request) {
  if (!tokenAllowed(request)) {
    const response = oauthError("rate_limited", "Too many requests, try again later", 429);
    response.headers.set("Retry-After", "60");
    return finishAuthorization(response, request);
  }
  const params = await parameterBody(request);
  if (!params.ok) {
    recordTokenFailure(request);
    return finishAuthorization(
      oauthError("invalid_request", "Invalid, oversized or duplicate request fields"),
      request,
    );
  }
  const result = await redeemMcpAuthorization(params.value);
  if (!result.ok) recordTokenFailure(request);
  return finishAuthorization(result.ok ? Response.json(result.token) : grantError(result), request);
}
