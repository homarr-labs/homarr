import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import {
  HomeAssistantCommandError,
  SmartHomeActionNotSupportedError,
  SmartHomeEntityNotFoundError,
} from "@homarr/integrations/home-assistant/errors";
import { SmartHomeSelectionLimitError } from "@homarr/integrations/types";
import type { SmartHomeAction, SmartHomeEntity, SmartHomeEntityPatch } from "@homarr/integrations/types";
import {
  smartHomeCatalogRequestHandler,
  smartHomeForecastRequestHandler,
  smartHomeHistoryRequestHandler,
  smartHomeSnapshotRequestHandler,
} from "@homarr/request-handler/smart-home";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { BoundedAsyncQueue } from "./bounded-async-queue";

const logger = createLogger({ module: "smartHomeRouter" });

const entityIdSchema = z
  .string()
  .max(255)
  .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, "Expected a Home Assistant entity ID such as light.living_room");

const selectionSchema = z.object({
  entityIds: z.array(entityIdSchema).max(200).default([]),
  areaIds: z.array(z.string().max(255)).max(50).default([]),
  domains: z.array(z.string().max(64)).max(400).default([]),
  excludedEntityIds: z.array(entityIdSchema).max(400).default([]),
});

const actionTypes = [
  "toggle",
  "turnOn",
  "turnOff",
  "setBrightness",
  "setColorTemp",
  "setRgbColor",
  "setEffect",
  "setTemperature",
  "setTemperatureRange",
  "setHvacMode",
  "setPresetMode",
  "setFanMode",
  "setHumidity",
  "setMode",
  "setPosition",
  "setTiltPosition",
  "open",
  "close",
  "stop",
  "lock",
  "unlock",
  "openLatch",
  "mediaPlayPause",
  "mediaPlay",
  "mediaPause",
  "mediaNext",
  "mediaPrevious",
  "setVolume",
  "setMuted",
  "selectSource",
  "trigger",
  "selectOption",
  "setValue",
  "setFanPercentage",
  "setOscillating",
  "increment",
  "decrement",
  "vacuumStart",
  "vacuumPause",
  "vacuumReturn",
  "vacuumLocate",
  "alarmArm",
  "alarmDisarm",
  "install",
  "timerStart",
  "timerPause",
  "timerCancel",
] as const satisfies readonly SmartHomeAction["type"][];

const actionInputSchema = z.object({
  entityId: entityIdSchema,
  action: z.enum(actionTypes),
  value: z.number().finite().optional(),
  low: z.number().finite().optional(),
  high: z.number().finite().optional(),
  option: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
  rgb: z
    .tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255), z.number().int().min(0).max(255)])
    .optional(),
  alarmMode: z.enum(["away", "home", "night", "vacation", "custom_bypass"]).optional(),
  code: z.string().max(32).optional(),
});

const protectedActionInputSchema = actionInputSchema.extend({
  action: z.enum(["lock", "unlock", "openLatch", "alarmArm", "alarmDisarm"]),
  code: z.string().min(1).max(32),
});

type ActionInput = z.infer<typeof actionInputSchema>;

const requireField = <TValue>(value: TValue | undefined, field: string): TValue => {
  if (value === undefined) throw new TRPCError({ code: "BAD_REQUEST", message: `Missing ${field} for this action` });
  return value;
};

const toAction = (input: ActionInput): SmartHomeAction => {
  switch (input.action) {
    case "setBrightness":
    case "setColorTemp":
    case "setTemperature":
    case "setHumidity":
    case "setPosition":
    case "setTiltPosition":
    case "setVolume":
    case "setValue":
    case "setFanPercentage":
      return { type: input.action, value: requireField(input.value, "value") };
    case "setTemperatureRange":
      return { type: input.action, low: requireField(input.low, "low"), high: requireField(input.high, "high") };
    case "setRgbColor":
      return { type: input.action, value: requireField(input.rgb, "rgb") };
    case "setEffect":
    case "setHvacMode":
    case "setPresetMode":
    case "setFanMode":
    case "setMode":
    case "selectSource":
    case "selectOption":
      return { type: input.action, value: requireField(input.option, "option") };
    case "setMuted":
    case "setOscillating":
      return { type: input.action, value: requireField(input.enabled, "enabled") };
    case "lock":
    case "unlock":
    case "openLatch":
    case "alarmDisarm":
      return { type: input.action, code: input.code };
    case "alarmArm":
      return { type: input.action, mode: requireField(input.alarmMode, "alarmMode"), code: input.code };
    default:
      return { type: input.action };
  }
};

const getCauses = (error: unknown): Error[] => {
  const causes: Error[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current instanceof Error; depth++) {
    causes.push(current);
    current = current.cause;
  }
  return causes;
};

const toActionError = (error: unknown) => {
  const causes = getCauses(error);
  const unsupported = causes.find((cause) => cause instanceof SmartHomeActionNotSupportedError);
  if (unsupported) return new TRPCError({ code: "BAD_REQUEST", message: unsupported.message });
  const notFound = causes.find((cause) => cause instanceof SmartHomeEntityNotFoundError);
  if (notFound) return new TRPCError({ code: "NOT_FOUND", message: notFound.message });
  const rejected = causes.find((cause) => cause instanceof HomeAssistantCommandError);
  if (rejected) return new TRPCError({ code: "BAD_REQUEST", message: rejected.message, cause: error });
  return new TRPCError({ code: "BAD_GATEWAY", message: "Home Assistant did not run the action", cause: error });
};

const MAX_PENDING_PATCHES = 1;

type SmartHomeIntegrationContext = Parameters<typeof smartHomeSnapshotRequestHandler.handler>[0];

interface LegacyEntityAttributes {
  friendly_name?: string;
  unit_of_measurement?: string;
  device_class?: string;
  icon?: string;
}

const automationIdSchema = z
  .string()
  .max(255)
  .regex(/^automation\.[a-z0-9_]+$/, "Expected a Home Assistant automation ID such as automation.morning");

const entityNotFound = (entityId: string) =>
  new TRPCError({ code: "NOT_FOUND", message: `Entity ${entityId} was not found` });

const toLegacyEntityDetails = (entity: SmartHomeEntity) => {
  const attributes: LegacyEntityAttributes = {};
  if (entity.name !== entity.id) attributes.friendly_name = entity.name;
  if (entity.unit) attributes.unit_of_measurement = entity.unit;
  if (entity.deviceClass) attributes.device_class = entity.deviceClass;
  if (entity.icon) attributes.icon = entity.icon;
  return {
    attributes,
    entity_id: entity.id,
    last_changed: new Date(entity.lastChanged),
    last_updated: new Date(entity.lastUpdated),
    state: entity.state,
  };
};

const getCachedEntityAsync = async (integration: SmartHomeIntegrationContext, entityId: string) => {
  const handler = smartHomeSnapshotRequestHandler.handler(integration, {
    entityIds: [entityId],
    areaIds: [],
    domains: [],
  });
  const { data } = await handler.getDataAsync();
  const entity = data.entities.find((candidate) => candidate.id === entityId);
  if (!entity) throw entityNotFound(entityId);
  return entity;
};

const runCheckedActionAsync = async (
  integration: SmartHomeIntegrationContext,
  entityId: string,
  action: SmartHomeAction,
) => {
  const instance = await createIntegrationAsync(integration);
  const entity = await instance.getSnapshotAsync({ entityIds: [entityId] }).then(
    ({ entities }) => entities.find((candidate) => candidate.id === entityId),
    (error: unknown) => {
      throw toActionError(error);
    },
  );
  if (!entity) throw entityNotFound(entityId);
  if (entity.state === "unavailable") {
    throw new TRPCError({ code: "CONFLICT", message: `Entity ${entityId} is unavailable` });
  }
  const receipt = await instance.executeActionAsync(entityId, action).catch((error: unknown) => {
    throw toActionError(error);
  });
  await smartHomeSnapshotRequestHandler.invalidateCacheAsync([integration.id]);
  return receipt;
};

const executeActionAsync = async (integration: SmartHomeIntegrationContext, input: ActionInput) => {
  const action = toAction(input);
  const receipt = await runCheckedActionAsync(integration, input.entityId, action);
  return { entityId: input.entityId, action: action.type, contextId: receipt?.contextId };
};

export const smartHomeRouter = createTRPCRouter({
  snapshot: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get normalized Home Assistant entities (state, unit, device class, area, and safe domain attributes such as brightness, temperatures, media info, cover position) plus their areas. REQUIRED: integrationId (Home Assistant integration ID from integration_all). Select with entityIds (e.g. 'light.living_room'), areaIds (from smartHome_catalog), domains (e.g. 'light') and excludedEntityIds. Domain/exclusion filters apply to room or implicit selections, not explicit entityIds. Returns at most 400 entities; narrow an overly broad selection rather than receiving silently truncated data",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(selectionSchema)
    .query(async ({ ctx: { integration }, input }) => {
      const handler = smartHomeSnapshotRequestHandler.handler(integration, input);
      try {
        const { data } = await handler.getDataAsync();
        return data;
      } catch (error) {
        const limit = getCauses(error).find((cause) => cause instanceof SmartHomeSelectionLimitError);
        if (limit) throw new TRPCError({ code: "BAD_REQUEST", message: limit.message });
        throw error;
      }
    }),
  catalog: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List every Home Assistant entity (ID, name, domain, area, icon, device class, hidden flag), area and floor. Use it to find entity IDs and area IDs for smartHome_snapshot and smartHome_executeAction. REQUIRED: integrationId (Home Assistant integration ID from integration_all)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .query(async ({ ctx: { integration } }) => {
      const handler = smartHomeCatalogRequestHandler.handler(integration, {});
      const { data } = await handler.getDataAsync();
      return data;
    }),
  history: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get evenly sampled numeric history for Home Assistant sensors (for example temperature, power or battery). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityIds (max 20). Optional hours (1-168, default 24) and samples (2-200, default 48)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(
      z.object({
        entityIds: z.array(entityIdSchema).min(1).max(20),
        hours: z.number().int().min(1).max(168).default(24),
        samples: z.number().int().min(2).max(200).default(48),
      }),
    )
    .query(async ({ ctx: { integration }, input }) => {
      const handler = smartHomeHistoryRequestHandler.handler(integration, {
        entityIds: input.entityIds.toSorted(),
        hours: input.hours,
        samples: input.samples,
      });
      const { data } = await handler.getDataAsync();
      return data;
    }),
  forecast: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the daily or hourly forecast of a Home Assistant weather entity. REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (a weather.* entity). Optional type: daily (default) or hourly",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(z.object({ entityId: entityIdSchema, type: z.enum(["daily", "hourly"]).default("daily") }))
    .query(async ({ ctx: { integration }, input }) => {
      const handler = smartHomeForecastRequestHandler.handler(integration, input);
      const { data } = await handler.getDataAsync();
      return data;
    }),
  executeAction: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Control one Home Assistant entity, for example toggle a light, set brightness (value 0-100), set a thermostat (setTemperature value, setTemperatureRange low/high, setHvacMode option), set cover position (value 0-100), lock/unlock, run a scene/script/automation/button (trigger), control media (mediaPlayPause, setVolume value 0-1) or arm/disarm an alarm (alarmMode). Actions requiring a security code must use the native widget controls; never request or send codes through this tool. Fails for unavailable entities. Requires interact access to the integration. REQUIRED: integrationId (from integration_all), entityId (from smartHome_catalog), action",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-entityState"))
    .input(actionInputSchema.omit({ code: true }))
    .mutation(({ ctx: { integration }, input }) => executeActionAsync(integration, input)),
  executeProtectedAction: protectedProcedure
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-entityState"))
    .input(protectedActionInputSchema)
    .mutation(({ ctx: { integration }, input }) => executeActionAsync(integration, input)),
  subscribeEntities: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(selectionSchema)
    .subscription(async function* ({ ctx: { integration }, input, signal }) {
      const queue = new BoundedAsyncQueue<true>(MAX_PENDING_PATCHES);
      const controller = new AbortController();
      const pendingChanged = new Map<string, SmartHomeEntity>();
      const pendingRemoved = new Set<string>();
      const stop = () => {
        controller.abort();
        void queue.return();
      };
      if (signal?.aborted) return;
      signal?.addEventListener("abort", stop, { once: true });

      const collect = (patch: SmartHomeEntityPatch) => {
        for (const entity of patch.changed) {
          pendingChanged.set(entity.id, entity);
          pendingRemoved.delete(entity.id);
        }
        for (const id of patch.removed) {
          pendingChanged.delete(id);
          pendingRemoved.add(id);
        }
        queue.push(true);
      };

      try {
        const instance = await createIntegrationAsync(integration);
        if (controller.signal.aborted) return;
        void instance.subscribeEntitiesAsync(input, collect, controller.signal).then(
          () => queue.close(),
          (error: unknown) => {
            if (controller.signal.aborted) return;
            logger.warn("Smart home live subscription failed", { integrationId: integration.id, error });
            queue.fail(
              new TRPCError({ code: "BAD_GATEWAY", message: "Live Home Assistant updates failed", cause: error }),
            );
          },
        );

        let announced = false;
        for await (const _ of queue) {
          if (announced && pendingChanged.size === 0 && pendingRemoved.size === 0) continue;
          announced = true;
          const patch: SmartHomeEntityPatch = { changed: [...pendingChanged.values()], removed: [...pendingRemoved] };
          pendingChanged.clear();
          pendingRemoved.clear();
          yield patch;
        }
      } finally {
        stop();
        signal?.removeEventListener("abort", stop);
      }
    }),
  entityState: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the current state of one Home Assistant entity (light, switch, sensor, etc.) as a string. Legacy tool: smartHome_snapshot returns richer data. REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room', from smartHome_catalog)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(z.object({ entityId: entityIdSchema }))
    .query(async ({ ctx: { integration }, input }) => {
      const entity = await getCachedEntityAsync(integration, input.entityId);
      return entity.state;
    }),
  entityDetails: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the state, last changed and updated times, and safe attributes (friendly_name, unit_of_measurement, device_class, icon) of one Home Assistant entity. Legacy tool: smartHome_snapshot returns richer data. REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'sensor.temperature', from smartHome_catalog)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(z.object({ entityId: entityIdSchema }))
    .query(async ({ ctx: { integration }, input }) => {
      const entity = await getCachedEntityAsync(integration, input.entityId);
      return toLegacyEntityDetails(entity);
    }),
  switchEntity: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Toggle one Home Assistant entity such as a light, switch, fan, cover or input boolean. Fails for unavailable entities and for locks. Legacy tool: prefer smartHome_executeAction. Requires interact access to the integration. REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room', from smartHome_catalog)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-entityState"))
    .input(z.object({ entityId: entityIdSchema }))
    .mutation(async ({ ctx: { integration }, input }) => {
      if (input.entityId.startsWith("lock.")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Locks cannot be toggled; use executeAction with lock or unlock",
        });
      }
      await runCheckedActionAsync(integration, input.entityId, { type: "toggle" });
      return true;
    }),
  executeAutomation: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Trigger one Home Assistant automation. Fails when the automation is unavailable. Legacy tool: prefer smartHome_executeAction with action trigger. Requires interact access to the integration. REQUIRED: integrationId (Home Assistant integration ID from integration_all), automationId (an automation.* entity ID from smartHome_catalog)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-executeAutomation"))
    .input(z.object({ automationId: automationIdSchema }))
    .mutation(async ({ ctx: { integration }, input }) => {
      await runCheckedActionAsync(integration, input.automationId, { type: "trigger" });
      return true;
    }),
});
