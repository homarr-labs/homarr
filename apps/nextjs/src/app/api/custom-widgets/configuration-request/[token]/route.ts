import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  claimCustomWidgetConfigurationRequest,
  completeCustomWidgetConfigurationRequest,
  configurePreviewSessionSource,
  getCustomWidgetConfigurationRequest,
  invalidateCustomWidgetResponseCache,
  parseStoredCustomWidgetDefinition,
  releaseCustomWidgetConfigurationRequest,
  serializeCustomWidgetDefinition,
} from "@homarr/api/custom-widget-configuration";
import { encryptSecret } from "@homarr/common/server";
import { customWidgetSourceSchema, hasSameCustomWidgetSourceAuthentication } from "@homarr/custom-widgets/core";
import { and, db, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";

import { requireCustomWidgetAdmin } from "../../admin";
import { readConfigurationRequestBody } from "../body";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const denied = await requireCustomWidgetAdmin();
  if (denied) return denied;
  const { token } = await context.params;
  const request = await getCustomWidgetConfigurationRequest(token);
  if (!request)
    return NextResponse.json({ error: "This source configuration request is invalid or expired." }, { status: 404 });
  return NextResponse.json(
    {
      widgetName: request.widgetName,
      sourceName: request.sourceName,
      kinds: request.kinds,
      source: request.source,
      expiresAt: request.expiresAt,
      status: request.status,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await requireCustomWidgetAdmin();
  if (denied) return denied;
  const { token } = await context.params;
  const pending = await getCustomWidgetConfigurationRequest(token);
  if (!pending || pending.status !== "pending") {
    return NextResponse.json({ error: "This credential request is invalid, completed, or expired." }, { status: 404 });
  }
  const parsedBody = await readConfigurationRequestBody(request);
  if (parsedBody.status === "too-large") {
    return NextResponse.json({ error: "The configuration payload is too large." }, { status: 413 });
  }
  if (parsedBody.status !== "ok") {
    return NextResponse.json({ error: "Enter a valid source configuration." }, { status: 400 });
  }
  const body = parsedBody.data;
  const sourceResult = customWidgetSourceSchema.safeParse({
    ...pending.source,
    baseUrl: body.baseUrl,
    networkScope: body.networkScope,
  });
  if (!sourceResult.success) {
    return NextResponse.json(
      { error: sourceResult.error.issues[0]?.message ?? "Enter a valid server URL." },
      { status: 400 },
    );
  }
  const secrets = pending.kinds.flatMap((kind) => {
    const value = body.secrets[kind];
    return typeof value === "string" && value.length > 0 && value.length <= 8192
      ? [{ sourceId: pending.sourceId, kind, value }]
      : [];
  });
  if (secrets.length !== pending.kinds.length) {
    return NextResponse.json({ error: "Enter every requested credential field." }, { status: 400 });
  }

  const claimed = await claimCustomWidgetConfigurationRequest(token);
  if (!claimed) {
    return NextResponse.json(
      { error: "This source configuration request is already being completed." },
      { status: 409 },
    );
  }

  try {
    if (claimed.target.type === "preview") {
      await configurePreviewSessionSource(
        claimed.target.id,
        claimed.userId,
        claimed.sourceId,
        sourceResult.data,
        secrets,
      );
      await invalidateCustomWidgetResponseCache([`custom-jsx:preview:${claimed.target.id}:`]);
    } else {
      const definition = await db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, claimed.target.id),
      });
      if (!definition) return NextResponse.json({ error: "The custom widget no longer exists." }, { status: 404 });
      const parsed = parseStoredCustomWidgetDefinition(definition);
      const currentSource = parsed.sources[claimed.sourceId];
      if (!currentSource) {
        return NextResponse.json(
          { error: "This API source changed after the setup link was created. Request a new setup link." },
          { status: 409 },
        );
      }
      if (!hasSameCustomWidgetSourceAuthentication(currentSource, claimed.source)) {
        return NextResponse.json(
          {
            error: "This API source authentication changed after the setup link was created. Request a new setup link.",
          },
          { status: 409 },
        );
      }
      const configuredSource = customWidgetSourceSchema.parse({
        ...currentSource,
        baseUrl: sourceResult.data.baseUrl,
        networkScope: sourceResult.data.networkScope,
      });
      const definitionChanges = {
        ...serializeCustomWidgetDefinition({
          ...parsed,
          sources: { ...parsed.sources, [claimed.sourceId]: configuredSource },
        }),
        updatedAt: new Date(),
      };
      const secretRows = secrets.map((secret) => ({
        definitionId: claimed.target.id,
        sourceId: secret.sourceId,
        kind: secret.kind,
        encryptedValue: encryptSecret(secret.value),
        updatedAt: new Date(),
      }));
      await handleTransactionsAsync(db, {
        async handleAsync(database, schema) {
          await database.transaction(async (transaction) => {
            await transaction
              .update(schema.customWidgetDefinitions)
              .set(definitionChanges)
              .where(eq(schema.customWidgetDefinitions.id, claimed.target.id));
            for (const secret of secretRows) {
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, claimed.target.id),
                    eq(schema.customWidgetSecrets.sourceId, secret.sourceId),
                    eq(schema.customWidgetSecrets.kind, secret.kind),
                  ),
                );
              await transaction.insert(schema.customWidgetSecrets).values(secret);
            }
          });
        },
        handleSync(database) {
          database.transaction((transaction) => {
            transaction
              .update(customWidgetDefinitions)
              .set(definitionChanges)
              .where(eq(customWidgetDefinitions.id, claimed.target.id))
              .run();
            for (const secret of secretRows) {
              transaction
                .delete(customWidgetSecrets)
                .where(
                  and(
                    eq(customWidgetSecrets.definitionId, claimed.target.id),
                    eq(customWidgetSecrets.sourceId, secret.sourceId),
                    eq(customWidgetSecrets.kind, secret.kind),
                  ),
                )
                .run();
              transaction.insert(customWidgetSecrets).values(secret).run();
            }
          });
        },
      });
    }

    await completeCustomWidgetConfigurationRequest(token);
    return NextResponse.json({ status: "completed" }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await releaseCustomWidgetConfigurationRequest(token);
  }
}
