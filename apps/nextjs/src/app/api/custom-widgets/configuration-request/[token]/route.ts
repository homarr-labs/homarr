import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  claimCustomWidgetConfigurationRequest,
  completeCustomWidgetConfigurationRequest,
  configureCustomWidgetSourceFromRequest,
  configurePreviewSessionSource,
  getCustomWidgetConfigurationRequest,
  invalidateCustomWidgetResponseCache,
  releaseCustomWidgetConfigurationRequest,
} from "@homarr/api/custom-widget-configuration";
import { customWidgetSourceSchema } from "@homarr/custom-widgets/core";
import { db } from "@homarr/db";

import { adminRoute } from "../../admin";
import { readConfigurationRequestBody } from "../body";

interface RouteContext {
  params: Promise<{ token: string }>;
}

const getConfigurationRequest = async (_request: NextRequest, context: RouteContext): Promise<Response> => {
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
};

const completeConfigurationRequest = async (request: NextRequest, context: RouteContext): Promise<Response> => {
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
      const result = await configureCustomWidgetSourceFromRequest(db, {
        definitionId: claimed.target.id,
        sourceId: claimed.sourceId,
        baseUrl: sourceResult.data.baseUrl,
        networkScope: sourceResult.data.networkScope,
        secrets,
        expectedSource: claimed.source,
      });
      if (result.status === "definition-not-found") {
        return NextResponse.json({ error: "The custom widget no longer exists." }, { status: 404 });
      }
      if (result.status === "source-not-found") {
        return NextResponse.json(
          { error: "This API source changed after the setup link was created. Request a new setup link." },
          { status: 409 },
        );
      }
      if (result.status === "binding-changed") {
        return NextResponse.json(
          {
            error: "This API source authentication changed after the setup link was created. Request a new setup link.",
          },
          { status: 409 },
        );
      }
    }

    await completeCustomWidgetConfigurationRequest(token);
    return NextResponse.json({ status: "completed" }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await releaseCustomWidgetConfigurationRequest(token);
  }
};

export const GET = adminRoute(getConfigurationRequest);
export const POST = adminRoute(completeConfigurationRequest);
