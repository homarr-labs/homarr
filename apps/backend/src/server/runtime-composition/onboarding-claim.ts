import type { ProductionOnboardingClaimOutput } from "@homarr/auth/nitro/production-sessions";
import type { FetchContribution } from "@homarr/contracts/contribution";

import type { OnboardingWireRequestOwner } from "./contracts";

export function createOnboardingClaimRoute(owner: OnboardingWireRequestOwner): FetchContribution {
  return Object.freeze<FetchContribution>({
    phase: "api",
    path: "/api/onboarding/claim",
    descendants: false,
    access: { kind: "public" },
    handle(context) {
      if (context.request.method !== "GET" && context.request.method !== "POST")
        return Promise.resolve({
          kind: "response",
          response: new Response(null, { status: 405, headers: { allow: "GET, POST" } }),
        });
      return owner.executeClaimAsync(context);
    },
  });
}

export function createOnboardingClaimResponse(output: ProductionOnboardingClaimOutput, secure: boolean): Response {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  let status: number;
  let body: string;
  if (output.status === "issued" || output.status === "active") {
    status = 200;
    body = JSON.stringify({ status: output.status, expiresAt: output.expiresAt });
    headers.set("set-cookie", output.setCookie);
  } else if (output.status === "locked") {
    status = 423;
    body = JSON.stringify({ code: "locked", expiresAt: output.expiresAt });
  } else if (output.status === "forbidden") {
    status = 403;
    body = JSON.stringify({ code: "administrator_required" });
  } else {
    if (output.status !== "finished") throw new Error("MAIN_ONBOARDING_CLAIM_OUTPUT_UNAVAILABLE");
    status = 409;
    body = JSON.stringify({ code: "finished" });
    let cookie =
      "homarr-onboarding-claim=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (secure) cookie += "; Secure";
    headers.set("set-cookie", cookie);
  }
  if (Buffer.byteLength(body, "utf8") > 4096) throw new Error("MAIN_ONBOARDING_CLAIM_OUTPUT_UNAVAILABLE");
  return new Response(body, { status, headers });
}
