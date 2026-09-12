import { widgetArtifactResponse } from "@homarr/api/custom-widget/packages";
import { auth } from "@homarr/auth/next";
import { db } from "@homarr/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = auth(async (request, context) => {
  const params = await context.params as { previewId: string; surface: string };
  return widgetArtifactResponse({ db, session: request.auth }, { ...params, css: request.nextUrl.searchParams.get("asset") === "css" });
});
