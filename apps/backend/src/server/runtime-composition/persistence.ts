import type { RuntimeContribution } from "@homarr/contracts/contribution";
import type {
  MainPersistenceConfig,
  MainPersistenceRuntime,
  ProxySettingsReader,
  PublicQueryDatabase,
} from "./contracts";

export interface MainPersistenceFactories<Database extends PublicQueryDatabase, Schema> {
  createPersistenceRuntime(configuration: MainPersistenceConfig): MainPersistenceRuntime<Database, Schema>;
  seedDataAsync(database: Database, options: { allowMockIntegration: false; demoMode: false }): Promise<void>;
  createProxySettingsReader(runtime: MainPersistenceRuntime<Database, Schema>): ProxySettingsReader;
}

export function createMainPersistenceResources<Database extends PublicQueryDatabase, Schema>(options: {
  readonly configuration: MainPersistenceConfig;
  readonly factories: MainPersistenceFactories<Database, Schema>;
}) {
  const configuration = Object.freeze({ ...options.configuration });
  const runtime = options.factories.createPersistenceRuntime(configuration);
  if (runtime.engine !== "sqlite" || runtime.phase !== "configured") {
    throw new Error("Main persistence factory did not return an unopened configured SQLite lifetime");
  }
  const proxyReader = options.factories.createProxySettingsReader(runtime);
  let initialization: Promise<void> | undefined;
  let closing: Promise<void> | undefined;
  let failure: unknown;
  let initialized = false;

  function assertCurrent(): void {
    if (closing || !initialized || runtime.phase !== "ready") {
      throw new Error("Main persistence is unavailable", { cause: failure });
    }
  }

  function ready(signal: AbortSignal): Promise<void> {
    if (closing) return Promise.reject(new Error("Main persistence is closing"));
    initialization ??= (async () => {
      try {
        signal.throwIfAborted();
        await runtime.openAsync();
        signal.throwIfAborted();
        await runtime.migrateSchemaAsync();
        signal.throwIfAborted();
        await runtime.migrateContentAsync(
          configuration.mode === "fresh"
            ? {
                initializeFreshAsync: (database) =>
                  options.factories.seedDataAsync(database, { allowMockIntegration: false, demoMode: false }),
              }
            : {},
        );
        signal.throwIfAborted();
        const readiness = await runtime.checkReadinessAsync();
        if (!readiness.ready || readiness.engine !== "sqlite" || readiness.phase !== "ready") {
          throw new Error("Main persistence readiness SQL did not succeed");
        }
        if (configuration.mode === "fresh") {
          await runtime.runAsync(async (database) => {
            const user = await database.query.users.findFirst({ columns: { id: true } });
            const onboarding = await database.query.onboarding.findFirst();
            if (user || onboarding?.step !== "start") {
              throw new Error("Fresh source initialization must leave users unset and onboarding at start");
            }
          });
        }
        signal.throwIfAborted();
        initialized = true;
      } catch (error) {
        failure = error;
        throw error;
      }
    })();
    return initialization;
  }

  function closeAsync(): Promise<void> {
    closing ??= (async () => {
      if (initialization) await initialization.catch(() => undefined);
      const failures: unknown[] = [];
      try {
        await proxyReader.closeAsync();
      } catch (error) {
        failures.push(error);
      }
      try {
        await runtime.closeAsync();
      } catch (error) {
        failures.push(error);
      }
      initialized = false;
      if (failures.length > 0) throw new AggregateError(failures, "Main persistence cleanup failed");
    })();
    return closing;
  }

  const contribution: RuntimeContribution = Object.freeze({ id: "main-persistence", ready, dispose: closeAsync });
  return Object.freeze({ runtime, proxyReader, contribution, assertCurrent, closeAsync });
}
