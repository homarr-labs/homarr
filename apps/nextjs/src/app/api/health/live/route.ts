import { performance } from "perf_hooks";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db } from "@homarr/db";
import { handshakeAsync } from "@homarr/redis";

const logger = createLogger({ module: "healthLiveRoute" });
const noStoreHeaders = { "Cache-Control": "no-store" };
const healthStatusCodes = { healthy: 200, unhealthy: 500 } as const;

export async function GET() {
  const timeBeforeHealthCheck = performance.now();
  const response = await executeAndAggregateAllHealthChecksAsync();
  logger.debug("Completed healthcheck", { elapsed: `${performance.now() - timeBeforeHealthCheck}ms` });

  return Response.json(response, {
    status: healthStatusCodes[response.status],
    headers: noStoreHeaders,
  });
}

const executeAndAggregateAllHealthChecksAsync = async (): Promise<{
  healthChecks: Record<string, object>;
  status: "healthy" | "unhealthy";
}> => {
  const healthChecks = [
    executeHealthCheckSafelyAsync("database", async () => {
      // sqlite driver does not support raw query execution. this is for a heartbeat check only - it doesn't matter if data is returned or not
      await db.query.serverSettings.findFirst();
      return {};
    }),
    executeHealthCheckSafelyAsync("redis", async () => {
      await handshakeAsync();
      return {};
    }),
  ];

  const healthCheckResults = await Promise.all(healthChecks);
  const anyUnhealthy = healthCheckResults.some((healthCheck) => healthCheck.status === "unhealthy");

  const healthCheckValues = healthCheckResults.reduce(
    (acc, healthCheck) => {
      acc[healthCheck.name] = {
        status: healthCheck.status,
        ...healthCheck.values,
      };
      return acc;
    },
    {} as Record<string, object>,
  );

  return {
    status: anyUnhealthy ? "unhealthy" : "healthy",
    healthChecks: healthCheckValues,
  };
};

const executeHealthCheckSafelyAsync = async (
  name: string,
  callback: () => Promise<object>,
): Promise<HealthCheckResult> => {
  const currentTimeBeforeCallback = performance.now();
  try {
    const values = await callback();
    return {
      name,
      status: "healthy",
      values: {
        ...values,
        latency: performance.now() - currentTimeBeforeCallback,
      },
    };
  } catch (error) {
    logger.error(new ErrorWithMetadata("Healthcheck failed", { name }, { cause: error }));
    return {
      status: "unhealthy",
      values: {
        latency: performance.now() - currentTimeBeforeCallback,
      },
      name,
    };
  }
};

interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  name: string;
  values: object;
}
