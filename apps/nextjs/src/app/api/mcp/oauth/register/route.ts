import { registerMcpClient } from "../_grant";
import { finishAuthorization, grantError, oauthError, registrationBody } from "../_http";
import { registrationAllowed } from "../_rate-limit";

export async function POST(request: Request) {
  if (!registrationAllowed(request)) {
    const response = oauthError("rate_limited", "Too many registration attempts, try again later", 429);
    response.headers.set("Retry-After", "60");
    return finishAuthorization(response, request);
  }
  const body = await registrationBody(request);
  if (!body.ok)
    return finishAuthorization(oauthError("invalid_request", "Invalid, oversized or duplicate JSON fields"), request);
  const result = registerMcpClient(body.value);
  return finishAuthorization(
    result.ok ? Response.json(result.registration, { status: 201 }) : grantError(result),
    request,
  );
}
