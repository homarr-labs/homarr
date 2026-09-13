import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { createConnection } from "node:net";

interface ServiceConfiguration {
  serviceType?: string;
  settings?: Record<string, unknown>;
  timeoutMs: number;
}

/** Probe only the declared transport. Protocol authentication belongs to the widget's preview handler. */
export async function diagnoseWidgetService(configuration: ServiceConfiguration) {
  const settings = configuration.settings ?? {};
  const details = {
    addresses: [] as { address: string; family: number }[],
    serviceType: configuration.serviceType,
    settingNames: Object.keys(settings),
  };
  try {
    if (configuration.serviceType === "sqlite" || configuration.serviceType === "file") {
      if (typeof settings.path !== "string" || !settings.path.trim())
        throw new Error("Set the service's path to a file mounted in the Homarr server or container");
      // An owner-selected mounted service file is not part of the application bundle.
      const file = await open(/* turbopackIgnore: true */ settings.path, constants.O_RDONLY | constants.O_NONBLOCK);
      try {
        const stat = await file.stat();
        if (!stat.isFile()) throw new Error("The configured path must point to a regular file");
        return { ...details, status: "fileReadable" as const, bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
      } finally {
        await file.close();
      }
    }
    if (configuration.serviceType === "mqtt") {
      if (typeof settings.url !== "string") throw new Error("Set url to mqtt://host:1883 or mqtts://host:8883");
      const url = new URL(settings.url);
      if (!["mqtt:", "mqtts:"].includes(url.protocol))
        throw new Error("The MQTT transport probe supports mqtt:// and mqtts://; use preview for WebSocket brokers");
      let port = 1883;
      if (url.protocol === "mqtts:") port = 8883;
      if (url.port) port = Number(url.port);
      const hostname = url.hostname.replace(/^\[|\]$/gu, "");
      const started = performance.now();
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ host: hostname, port });
        const finish = (error?: Error) => {
          socket.destroy();
          if (error) reject(error);
          else resolve();
        };
        socket.setTimeout(Math.min(configuration.timeoutMs, 10_000), () =>
          finish(new Error("TCP connection timed out")),
        );
        socket.once("connect", () => finish());
        socket.once("error", finish);
      });
      return {
        ...details,
        status: "transportReachable" as const,
        hostname,
        port,
        durationMs: Math.round(performance.now() - started),
      };
    }
    return { ...details, status: "serviceConfigured" as const };
  } catch (error) {
    return {
      ...details,
      status: "serviceUnavailable" as const,
      error: { message: error instanceof Error ? error.message : "The service probe failed" },
    };
  }
}
