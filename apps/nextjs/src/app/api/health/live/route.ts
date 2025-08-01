import { performance } from "perf_hooks";

import { db } from "@homarr/db";
import { logger } from "@homarr/log";
import { handshakeAsync } from "@homarr/redis";

export async function GET() {
  const timeBeforeHealthCheck = performance.now();
  const response = await executeAndAggregateAllHealthChecksAsync();
  logger.info(`Completed healthcheck after ${performance.now() - timeBeforeHealthCheck}ms`);

  if (response.status === "healthy") {
    return new Response(JSON.stringify(response), {
      status: 200,
    });
  }

  return new Response(JSON.stringify(response), {
    status: 500,
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
  try {
    const currentTimeBeforeCallback = performance.now();
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
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger.error(`Healthcheck '${name}' has failed: ${error}`);
    return {
      status: "unhealthy",
      values: {
        error,
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

export const dynamic = "force-dynamic";
