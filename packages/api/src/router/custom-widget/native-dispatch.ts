import { TRPCError } from "@trpc/server";

import { beszelRouter } from "../widgets/beszel";
import { calendarRouter } from "../widgets/calendar";
import { mediaRequestsRouter } from "../widgets/media-requests";
import { smartHomeRouter } from "../widgets/smart-home";
import { dockerRouter } from "../docker/docker-router";
import { nativeCapabilities as catalog } from "./native-catalog";
import type { NativeContext, ResolvedNative } from "./native-context";

export async function queryNative(ctx: NativeContext, resolved: ResolvedNative) {
  const { capability, values, integrationIds } = resolved;
  const integrationId = integrationIds[0] ?? "";
  switch (capability) {
    case "beszel.systems":
      return beszelRouter.createCaller(ctx).getSystems({ integrationIds });
    case "beszel.history":
      return beszelRouter
        .createCaller(ctx)
        .getSystemStats({ integrationIds, ...catalog[capability].input.parse(values) });
    case "beszel.live":
      return beszelRouter.createCaller(ctx).getSystemStats({
        integrationIds,
        ...catalog[capability].input.parse(values),
        timePeriod: "1m",
        includeDocker: true,
      });
    case "beszel.alerts":
      return beszelRouter.createCaller(ctx).getAlerts({ integrationIds, ...catalog[capability].input.parse(values) });
    case "calendar.events":
      return calendarRouter
        .createCaller(ctx)
        .findAllEvents({ integrationIds, ...catalog[capability].input.parse(values) });
    case "media.requests":
      return mediaRequestsRouter
        .createCaller(ctx)
        .getLatestRequests({ integrationIds, ...catalog[capability].input.parse(values) });
    case "media.stats":
      return mediaRequestsRouter.createCaller(ctx).getStats({ integrationIds });
    case "smartHome.state":
      return smartHomeRouter
        .createCaller(ctx)
        .entityState({ integrationId, ...catalog[capability].input.parse(values) });
    case "smartHome.details":
      return smartHomeRouter
        .createCaller(ctx)
        .entityDetails({ integrationId, ...catalog[capability].input.parse(values) });
    case "docker.containers":
      return dockerRouter.createCaller(ctx).getContainers(catalog[capability].input.parse(values));
    default:
      throw new TRPCError({ code: "BAD_REQUEST", message: "Capability is not a query" });
  }
}

export async function actionNative(ctx: NativeContext, resolved: ResolvedNative) {
  const { capability, values, integrationIds } = resolved;
  const integrationId = integrationIds[0] ?? "";
  switch (capability) {
    case "media.respond":
      return mediaRequestsRouter
        .createCaller(ctx)
        .answerRequest({ integrationId, ...catalog[capability].input.parse(values) });
    case "smartHome.switch":
      return smartHomeRouter
        .createCaller(ctx)
        .switchEntity({ integrationId, ...catalog[capability].input.parse(values) });
    case "smartHome.automation":
      return smartHomeRouter
        .createCaller(ctx)
        .executeAutomation({ integrationId, ...catalog[capability].input.parse(values) });
    case "docker.start":
    case "docker.stop":
    case "docker.restart": {
      const { endpointId, containerId } = catalog[capability].input.parse(values);
      const input = { targets: [{ endpointId, id: containerId }] };
      const caller = dockerRouter.createCaller(ctx);
      let results;
      if (capability === "docker.start") results = await caller.startAll(input);
      else if (capability === "docker.stop") results = await caller.stopAll(input);
      else results = await caller.restartAll(input);
      if (results.some((result) => !result.success))
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Docker operation failed" });
      return results;
    }
    default:
      throw new TRPCError({ code: "BAD_REQUEST", message: "Capability is not an action" });
  }
}
