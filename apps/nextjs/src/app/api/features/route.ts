import { getFeatureFlagsAsync } from "@homarr/api/features";
import { auth } from "@homarr/auth/next";
import { db } from "@homarr/db";

/**
 * Reports which optional features are switched on for this instance.
 *
 * Kept deliberately small: booleans only, no configuration detail, so it stays cheap to call and
 * safe to hand to the client. It is the single place to look when deciding whether a feature's
 * client code needs to be loaded at all.
 *
 * Requires a session because whether an instance runs an AI assistant is not something an
 * anonymous visitor needs to know.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const features = await getFeatureFlagsAsync(db);

  return Response.json({ features }, { headers: { "Cache-Control": "private, max-age=60" } });
}
