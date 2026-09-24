import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  claimCustomWidgetConfigurationRequestForUser,
  assertCustomWidgetIntegrationBindings,
  completeCustomWidgetConfigurationRequest,
  configureCustomWidgetSourceFromRequest,
  configurePreviewSessionSource,
  getCustomWidgetConfigurationRequestForUser,
  releaseCustomWidgetConfigurationRequest,
  retryCustomWidgetConfigurationRequest,
} from "@homarr/api/custom-widget-configuration";
import { customWidgetSourceSchema, isCustomWidgetSourceUrlPlaceholder } from "@homarr/custom-widgets/core";
import { invalidateCustomWidgetResponseCache } from "@homarr/custom-widgets/server";
import { db } from "@homarr/db";

import type { AdminSession } from "../../admin";
import { adminRouteWithSession } from "../../admin";
import { readConfigurationRequestBody } from "../body";

interface RouteContext {
  params: Promise<{ token: string }>;
}

const getConfigurationRequest = async (
  session: AdminSession,
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> => {
  const { token } = await context.params;
  const request = await getCustomWidgetConfigurationRequestForUser(token, session.user.id);
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

const completeConfigurationRequest = async (
  session: AdminSession,
  request: NextRequest,
  context: RouteContext,
): Promise<Response> => {
  const { token } = await context.params;
  const pending = await getCustomWidgetConfigurationRequestForUser(token, session.user.id);
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
  let candidate: unknown;
  if (pending.source.type === "integration") {
    if (
      !body.integrationId ||
      body.baseUrl !== undefined ||
      body.networkScope !== undefined ||
      Object.keys(body.secrets).length > 0
    ) {
      return NextResponse.json({ error: "Select an existing integration." }, { status: 400 });
    }
    candidate = { ...pending.source, integrationId: body.integrationId };
  } else {
    if (body.integrationId)
      return NextResponse.json({ error: "HTTP sources cannot bind an integration." }, { status: 400 });
    candidate = { ...pending.source, baseUrl: body.baseUrl, networkScope: body.networkScope };
  }
  const sourceResult = customWidgetSourceSchema.safeParse(candidate);
  if (!sourceResult.success) {
    return NextResponse.json(
      { error: sourceResult.error.issues[0]?.message ?? "Enter a valid server URL." },
      { status: 400 },
    );
  }
  if (sourceResult.data.type !== "integration" && isCustomWidgetSourceUrlPlaceholder(sourceResult.data.baseUrl)) {
    return NextResponse.json({ error: "Replace the suggested URL with the actual server URL." }, { status: 400 });
  }
  try {
    await assertCustomWidgetIntegrationBindings({ db, session }, { [pending.sourceId]: sourceResult.data });
  } catch {
    return NextResponse.json(
      { error: "The selected integration is unavailable or has a different type." },
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

  const claimed = await claimCustomWidgetConfigurationRequestForUser(token, session.user.id);
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
      invalidateCustomWidgetResponseCache([`custom-jsx:preview:${claimed.target.id}:`]);
    } else {
      const result = await configureCustomWidgetSourceFromRequest(db, {
        definitionId: claimed.target.id,
        sourceId: claimed.sourceId,
        integrationId: sourceResult.data.integrationId,
        baseUrl: sourceResult.data.baseUrl,
        networkScope: sourceResult.data.networkScope,
        secrets,
        expectedSource: claimed.source,
      });
      if (result.status === "definition-not-found") {
        await retryCustomWidgetConfigurationRequest(token);
        return NextResponse.json({ error: "The custom widget no longer exists." }, { status: 404 });
      }
      if (result.status === "source-not-found") {
        await retryCustomWidgetConfigurationRequest(token);
        return NextResponse.json(
          { error: "This API source changed after the setup link was created. Request a new setup link." },
          { status: 409 },
        );
      }
      if (result.status === "binding-changed") {
        await retryCustomWidgetConfigurationRequest(token);
        return NextResponse.json(
          {
            error: "This API source authentication changed after the setup link was created. Request a new setup link.",
          },
          { status: 409 },
        );
      }
    }

    const completed = await completeCustomWidgetConfigurationRequest(token);
    if (!completed) {
      return NextResponse.json(
        { error: "The source was configured, but the setup request could not be completed. Request a new setup link." },
        { status: 409 },
      );
    }
    return NextResponse.json({ status: "completed" }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await releaseCustomWidgetConfigurationRequest(token);
  }
};

export const GET = adminRouteWithSession(getConfigurationRequest);
export const POST = adminRouteWithSession(completeConfigurationRequest);
