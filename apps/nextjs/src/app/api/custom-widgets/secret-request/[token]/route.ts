import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  claimCustomWidgetSecretRequest,
  completeCustomWidgetSecretRequest,
  getCustomWidgetSecretRequest,
  releaseCustomWidgetSecretRequest,
  setPreviewSessionSecrets,
} from "@homarr/api/custom-widget-secrets";
import { encryptSecret } from "@homarr/common/server";
import { invalidateCustomWidgetResponseCache } from "@homarr/custom-widgets/server";
import { and, db, eq } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const request = await getCustomWidgetSecretRequest(token);
  if (!request) return NextResponse.json({ error: "This credential request is invalid or expired." }, { status: 404 });
  return NextResponse.json(
    {
      widgetName: request.widgetName,
      sourceName: request.sourceName,
      kinds: request.kinds,
      expiresAt: request.expiresAt,
      status: request.status,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const pending = await getCustomWidgetSecretRequest(token);
  if (!pending || pending.status !== "pending") {
    return NextResponse.json({ error: "This credential request is invalid, completed, or expired." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { secrets?: Record<string, unknown> } | null;
  const secrets = pending.kinds.flatMap((kind) => {
    const value = body?.secrets?.[kind];
    return typeof value === "string" && value.length > 0 && value.length <= 8192
      ? [{ sourceId: pending.sourceId, kind, value }]
      : [];
  });
  if (secrets.length !== pending.kinds.length) {
    return NextResponse.json({ error: "Enter every requested credential field." }, { status: 400 });
  }

  const claimed = await claimCustomWidgetSecretRequest(token);
  if (!claimed) {
    return NextResponse.json({ error: "This credential request is already being completed." }, { status: 409 });
  }

  try {
    if (claimed.target.type === "preview") {
      await setPreviewSessionSecrets(claimed.target.id, claimed.userId, secrets);
      invalidateCustomWidgetResponseCache([`custom-jsx:preview:${claimed.target.id}:`]);
    } else {
      const definition = await db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, claimed.target.id),
      });
      if (!definition) return NextResponse.json({ error: "The custom widget no longer exists." }, { status: 404 });
      for (const secret of secrets) {
        await db
          .delete(customWidgetSecrets)
          .where(
            and(
              eq(customWidgetSecrets.definitionId, claimed.target.id),
              eq(customWidgetSecrets.sourceId, secret.sourceId),
              eq(customWidgetSecrets.kind, secret.kind),
            ),
          );
        await db.insert(customWidgetSecrets).values({
          definitionId: claimed.target.id,
          sourceId: secret.sourceId,
          kind: secret.kind,
          encryptedValue: encryptSecret(secret.value),
          updatedAt: new Date(),
        });
      }
      await db
        .update(customWidgetDefinitions)
        .set({ updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, claimed.target.id));
    }

    await completeCustomWidgetSecretRequest(token);
    return NextResponse.json({ status: "completed" }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await releaseCustomWidgetSecretRequest(token);
  }
}
