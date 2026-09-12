import { widgetWebhookResponse } from "@homarr/api/custom-widget/webhooks";
import { db } from "@homarr/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ itemId: string; id: string }> }) {
  return widgetWebhookResponse(db, request, await context.params);
}
