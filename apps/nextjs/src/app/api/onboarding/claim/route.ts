import { NextResponse } from "next/server";

import {
  claimOnboardingAsync,
  getOnboardingClaimTokenFromCookieHeader,
  onboardingClaimCookieName,
} from "@homarr/api/onboarding-claim";
import { auth } from "@homarr/auth/next";
import { db } from "@homarr/db";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ code: "cross_site" }, { status: 403 });
  }

  const session = await auth();
  const result = await claimOnboardingAsync(db, {
    currentToken: getOnboardingClaimTokenFromCookieHeader(request.headers.get("cookie")),
    force: session?.user.permissions.includes("admin") ?? false,
  });
  if (result.status === "finished") {
    const response = NextResponse.json({ code: "finished" }, { status: 409 });
    response.cookies.delete(onboardingClaimCookieName);
    return response;
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ code: "administrator_required" }, { status: 403 });
  }
  if (result.status === "locked") {
    return NextResponse.json({ code: "locked", expiresAt: result.expiresAt }, { status: 423, headers: noStoreHeaders });
  }
  if (result.status !== "issued" && result.status !== "active") {
    return NextResponse.json({ code: "unavailable" }, { status: 409 });
  }

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
  const response = NextResponse.json(
    { status: result.status, expiresAt: result.expiresAt },
    { headers: noStoreHeaders },
  );
  response.cookies.set(onboardingClaimCookieName, result.token, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    expires: new Date(result.expiresAt),
  });
  return response;
}
