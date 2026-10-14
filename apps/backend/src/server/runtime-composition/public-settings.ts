import type { RequestContext, RequestServices, SetupState } from "@homarr/contracts/request";
import type { AdmissionRuntime, ProxySettingsReader, PublicSettingsShape, SettingsReader } from "./contracts";

export function createPublicSqlSettings<Database, Schema, Settings extends PublicSettingsShape, Resources>(options: {
  readonly runtime: AdmissionRuntime<Database, Schema>;
  readonly proxyReader: Pick<ProxySettingsReader, "getOnboardingStepAsync">;
  readonly createSettingsStore: (resources: Resources) => SettingsReader<Database, Settings>;
  readonly settingsResources: (schema: Schema) => Resources;
  assertCurrent(): void;
}) {
  const projectionKey = Symbol("public-sql-settings");

  async function readAsync(context: RequestContext) {
    return context.memoize(projectionKey, async () => {
      options.assertCurrent();
      context.signal.throwIfAborted();
      if (options.runtime.engine !== "sqlite")
        throw new Error("Public SQL settings require the selected SQLite engine");
      return options.runtime.runAsync(async (database, schema) => {
        const store = options.createSettingsStore(options.settingsResources(schema));
        async function read<Key extends keyof Settings>(key: Key) {
          context.signal.throwIfAborted();
          options.assertCurrent();
          try {
            return await store.read(database, key);
          } finally {
            context.signal.throwIfAborted();
            options.assertCurrent();
          }
        }
        const culture = await read("culture");
        const appearance = await read("appearance");
        const board = await read("board");
        const search = await read("search");
        const user = await read("user");
        const branding = await read("branding");
        context.signal.throwIfAborted();
        options.assertCurrent();
        return Object.freeze({
          culture: Object.freeze({ defaultLocale: culture.defaultLocale }),
          appearance: Object.freeze({ defaultColorScheme: appearance.defaultColorScheme }),
          serverSettings: Object.freeze({
            board: Object.freeze({
              homeBoardId: board.homeBoardId,
              mobileHomeBoardId: board.mobileHomeBoardId,
              enableStatusByDefault: board.enableStatusByDefault,
              forceDisableStatus: board.forceDisableStatus,
            }),
            search: Object.freeze({ defaultSearchEngineId: search.defaultSearchEngineId }),
            user: Object.freeze({ enableGravatar: user.enableGravatar }),
            branding: Object.freeze(structuredClone(branding)),
          }),
        });
      });
    });
  }

  const services: RequestServices = {
    async resolvePrincipal({ signal }) {
      signal.throwIfAborted();
      return { kind: "anonymous" };
    },
    async resolveSetup({ signal }): Promise<SetupState> {
      options.assertCurrent();
      signal.throwIfAborted();
      const step = await options.proxyReader.getOnboardingStepAsync();
      signal.throwIfAborted();
      options.assertCurrent();
      return step === "finish" ? { kind: "ready" } : { kind: "required" };
    },
    async authorize(principal, _requirement, signal) {
      signal.throwIfAborted();
      return { kind: "deny", status: principal.kind === "anonymous" ? 401 : 403 };
    },
  };

  return Object.freeze({ readAsync, services });
}
