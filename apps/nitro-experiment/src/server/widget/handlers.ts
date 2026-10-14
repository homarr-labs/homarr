import { sourceControlOutputSchema, sourcePayloadSchema } from "../../contracts/schemas";
import { assertLocalRequest, authorizeSourceControl } from "../access/guards";
import type { RequestContext } from "../context/request";
import { WidgetSourceError } from "./body";
import { controlSource } from "./service";
import { readControlInput, readSource } from "./source";

export async function handleSource(context: RequestContext): Promise<Response> {
  assertLocalRequest(context);
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (context.request.method !== "GET") {
    headers.set("Allow", "GET");
    return Response.json({ code: "BAD_REQUEST" }, { status: 405, headers });
  }
  if (new URL(context.request.url).pathname !== "/fixture/source" || new URL(context.request.url).search) {
    return Response.json({ code: "BAD_REQUEST" }, { status: 400, headers });
  }
  try {
    context.signal.throwIfAborted();
    const payload = sourcePayloadSchema.parse(await readSource(context.signal, context.config.widget));
    context.signal.throwIfAborted();
    return Response.json(payload, { headers });
  } catch (error) {
    const status = error instanceof WidgetSourceError && error.code === "timeout" ? 504 : 503;
    headers.set("X-Fixture-Source-Error", error instanceof WidgetSourceError ? error.code : "source-error");
    return Response.json({ code: "SERVICE_UNAVAILABLE" }, { status, headers });
  }
}

export async function handleSourceControl(context: RequestContext): Promise<Response> {
  authorizeSourceControl(context);
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (context.request.method !== "POST") {
    headers.set("Allow", "POST");
    return Response.json({ code: "BAD_REQUEST" }, { status: 405, headers });
  }
  if (new URL(context.request.url).pathname !== "/fixture/source/control" || new URL(context.request.url).search) {
    return Response.json({ code: "BAD_REQUEST" }, { status: 400, headers });
  }
  const input = await readControlInput(context.request, context.config.widget);
  const output = sourceControlOutputSchema.parse(await controlSource(context, input));
  return Response.json(output, { headers });
}
