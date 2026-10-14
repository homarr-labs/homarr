import { useNitroApp, useNitroHooks } from "nitro/app";
import { serve } from "srvx/bun";

import { closeApplication } from "@homarr/backend/host";
import { createPublicOriginIngress } from "../src/server/public-origin-ingress";
import { initializeStartupConfiguration } from "../src/server/startup-configuration";

const configuration = await initializeStartupConfiguration(import.meta.url);
const admitPublicOrigin = createPublicOriginIngress(configuration.host.baseUrl);
const nitro = useNitroApp();
const requested = Promise.withResolvers<void>();
let closing = false;

const server = serve({
  hostname: configuration.listener.hostname,
  port: configuration.listener.port,
  protocol: "http",
  reusePort: false,
  trustProxy: false,
  manual: true,
  gracefulShutdown: false,
  silent: true,
  fetch(request) {
    if (closing) return new Response("Service unavailable", { status: 503 });
    const admitted = admitPublicOrigin(request);
    if (admitted === null) return new Response("Bad request", { status: 400 });
    return nitro.fetch(admitted);
  },
});

function requestShutdown(): void {
  closing = true;
  requested.resolve();
}

process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);

const errors: unknown[] = [];
try {
  await server.serve();
  console.info("Listener bound; application readiness has not been established", configuration.host.baseUrl);
  await requested.promise;
} catch (error) {
  errors.push(error);
} finally {
  closing = true;
  const outcomes = await Promise.allSettled([
    Promise.resolve().then(closeApplication),
    Promise.resolve().then(() => server.close()),
    Promise.resolve().then(() => useNitroHooks().callHook("close")),
  ]);
  process.off("SIGINT", requestShutdown);
  process.off("SIGTERM", requestShutdown);
  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      const error: unknown = outcome.reason;
      if (!errors.includes(error)) errors.push(error);
    }
  }
}

if (errors.length > 0)
  throw new AggregateError(errors, "Application listener or shutdown failed", { cause: errors[0] });
