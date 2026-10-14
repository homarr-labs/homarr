import type { Application } from "@homarr/contracts/contribution";
import { composeApplication } from "./compose";
import type { createPublicHostRuntime } from "./runtime-composition/runtime";
import { loadStartupConfiguration } from "./startup-configuration";

export type PreparedApplicationRenderer = Parameters<typeof createPublicHostRuntime>[0]["render"];

const startup = new AbortController();
let initialization: Promise<Application> | undefined;
let disposal: Promise<void> | undefined;

export function fetchApplication(request: Request, render: PreparedApplicationRenderer): Promise<Response> {
  if (disposal) return Promise.resolve(new Response("Service unavailable", { status: 503 }));
  if (!initialization) {
    const pending = Promise.withResolvers<Application>();
    initialization = pending.promise;
    Promise.resolve()
      .then(async () => {
        let application: Application | undefined;
        try {
          const configuration = await loadStartupConfiguration();
          startup.signal.throwIfAborted();
          const host = await composeApplication(configuration, startup.signal, render);
          application = host.application;
          startup.signal.throwIfAborted();
          await application.ready();
          startup.signal.throwIfAborted();
          return application;
        } catch (error) {
          if (application) {
            try {
              await application.dispose();
            } catch (cleanupError) {
              throw new AggregateError([error, cleanupError], "Application startup and cleanup failed", {
                cause: error,
              });
            }
          }
          throw error;
        }
      })
      .then(pending.resolve, pending.reject);
  }
  return initialization.then((application) => {
    if (disposal) return new Response("Service unavailable", { status: 503 });
    return application.fetch(request);
  });
}

export function closeApplication(): Promise<void> {
  if (disposal) return disposal;
  const pending = Promise.withResolvers<void>();
  disposal = pending.promise;
  Promise.resolve()
    .then(async () => {
      startup.abort();
      if (initialization) {
        const application = await initialization;
        await application.dispose();
      }
    })
    .then(pending.resolve, pending.reject);
  return disposal;
}
