import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

export const dockhandEnvironmentSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const dockhandEnvironmentsResponseSchema = z.array(dockhandEnvironmentSchema);

export const dockhandEnvironmentStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  online: z.boolean().optional(),
  containers: z.object({
    total: z.number(),
    running: z.number(),
    stopped: z.number(),
    unhealthy: z.number(),
    pendingUpdates: z.number(),
  }),
  images: z.object({
    total: z.number(),
    totalSize: z.number(),
  }),
  volumes: z.object({
    total: z.number(),
  }),
  stacks: z.object({
    total: z.number(),
    running: z.number(),
  }),
});

export const dockhandDashboardStatsResponseSchema = z.array(dockhandEnvironmentStatsSchema);

export const dockhandActivityResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.number(),
      environmentId: z.number().nullable().optional(),
      containerName: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      action: z.string(),
      timestamp: z.string(),
    }),
  ),
});

export type DockhandEnvironment = z.infer<typeof dockhandEnvironmentSchema>;
export type DockhandEnvironmentStats = z.infer<typeof dockhandEnvironmentStatsSchema>;
export type DockhandActivityEvent = z.infer<typeof dockhandActivityResponseSchema>["events"][number];

export interface DockhandStats {
  environments: number;
  environmentsOnline: number;
  /** Container, stack, image and volume totals are null when no environment is reachable. */
  containersRunning: number | null;
  containersStopped: number | null;
  containersUnhealthy: number | null;
  containersTotal: number | null;
  updatesAvailable: number | null;
  stacksRunning: number | null;
  stacksTotal: number | null;
  images: number | null;
  imagesSize: number | null;
  volumes: number | null;
}

export const parseDockhandResponseAsync = async <TSchema extends z.ZodType>(
  response: { json: () => Promise<unknown> },
  schema: TSchema,
  message: string,
): Promise<z.infer<TSchema>> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError(message, { cause: error instanceof Error ? error : new Error(String(error)) });
  }

  const parseResult = await schema.safeParseAsync(json);
  if (!parseResult.success) {
    throw new ParseError(message, { cause: parseResult.error });
  }

  return parseResult.data;
};

/** Dockhand records event times as UTC but its database may return them without a zone ("2026-01-01 12:00:00.000"). */
export const parseDockhandTimestamp = (value: string) =>
  new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(" ", "T")}Z`);

const sum = (environments: DockhandEnvironmentStats[], pick: (environment: DockhandEnvironmentStats) => number) =>
  environments.reduce((total, environment) => total + pick(environment), 0);

/** Offline environments report zeroed counts, so only reachable environments are summed. */
export const mapDockhandStats = (environments: DockhandEnvironmentStats[]): DockhandStats => {
  const online = environments.filter((environment) => environment.online === true);
  const total = (pick: (environment: DockhandEnvironmentStats) => number) =>
    online.length > 0 ? sum(online, pick) : null;

  return {
    environments: environments.length,
    environmentsOnline: online.length,
    containersRunning: total((environment) => environment.containers.running),
    containersStopped: total((environment) => environment.containers.stopped),
    containersUnhealthy: total((environment) => environment.containers.unhealthy),
    containersTotal: total((environment) => environment.containers.total),
    updatesAvailable: total((environment) => environment.containers.pendingUpdates),
    stacksRunning: total((environment) => environment.stacks.running),
    stacksTotal: total((environment) => environment.stacks.total),
    images: total((environment) => environment.images.total),
    imagesSize: total((environment) => environment.images.totalSize),
    volumes: total((environment) => environment.volumes.total),
  };
};
