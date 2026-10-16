import {
  claimOnboardingAsync,
  getOnboardingClaimTokenFromCookieHeader,
  onboardingClaimCookieName,
} from "@homarr/api/onboarding-claim";
import { getSessionFromRequestAsync } from "@homarr/auth/request-session";
import { db } from "@homarr/db";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return Response.json({ code: "cross_site" }, { status: 403 });
  }

  const session = await getSessionFromRequestAsync(request);
  const result = await claimOnboardingAsync(db, {
    currentToken: getOnboardingClaimTokenFromCookieHeader(request.headers.get("cookie")),
    force: session?.user.permissions.includes("admin") ?? false,
  });
  if (result.status === "finished") {
    return Response.json(
      { code: "finished" },
      {
        status: 409,
        headers: { "Set-Cookie": `${onboardingClaimCookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT` },
      },
    );
  }
  if (result.status === "forbidden") {
    return Response.json({ code: "administrator_required" }, { status: 403 });
  }
  if (result.status === "locked") {
    return Response.json({ code: "locked", expiresAt: result.expiresAt }, { status: 423, headers: noStoreHeaders });
  }
  if (result.status !== "issued" && result.status !== "active") {
    return Response.json({ code: "unavailable" }, { status: 409 });
  }

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
  const cookie = [
    `${onboardingClaimCookieName}=${encodeURIComponent(result.token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Expires=${new Date(result.expiresAt).toUTCString()}`,
  ];
  if (secure) cookie.push("Secure");
  return Response.json(
    { status: result.status, expiresAt: result.expiresAt },
    {
      headers: { ...noStoreHeaders, "Set-Cookie": cookie.join("; ") },
    },
  );
}
