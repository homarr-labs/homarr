import { createBackendContext } from "../../context";
import type { BackendContext, BackendSetupResources } from "../../context";
import { getOnboardingOrFallback } from "../../routers/-settings-setup/steps";
import {
  getOnboardingClaimTokenFromCookieHeader,
  matchesStoredOnboardingClaim,
  onboardingClaimSettingKey,
} from "./claims";
import type { SetupBackedContextInput, SetupReadAdmission, SetupReadResources } from "./resources";

export class SetupReadAdmissionError extends Error {
  constructor(readonly reason: "foreign-database" | "cancelled" | "inactive" | "request-signal-mismatch") {
    super("Setup read admission is unavailable");
    this.name = "SetupReadAdmissionError";
  }
}

function createAdmissionFence(admission: SetupReadAdmission) {
  const { database, signal } = admission;
  return (current: BackendContext["db"]) => {
    if (current !== database) throw new SetupReadAdmissionError("foreign-database");
    if (signal.aborted) throw new SetupReadAdmissionError("cancelled");
    try {
      admission.assertCurrent();
    } catch {
      throw new SetupReadAdmissionError("inactive");
    }
    if (signal.aborted) throw new SetupReadAdmissionError("cancelled");
  };
}

export function createSetupReadResources(
  admission: SetupReadAdmission,
  resources: SetupReadResources,
): BackendSetupResources {
  const { database, schema } = admission;
  const { eq } = resources.operators;
  const assertCurrent = createAdmissionFence(admission);
  assertCurrent(database);

  async function readAsync<Value>(operation: () => Promise<Value>): Promise<Value> {
    assertCurrent(database);
    try {
      return await operation();
    } finally {
      assertCurrent(database);
    }
  }

  return Object.freeze({
    async isClaimOnlyAccessAllowed(db: BackendContext["db"], claimToken: string | undefined) {
      assertCurrent(db);
      const now = resources.now();
      const existingUser = await readAsync(() => db.query.users.findFirst({ columns: { id: true } }));
      if (existingUser || !claimToken) return false;
      const row = await readAsync(() =>
        db.query.serverSettings.findFirst({
          where: eq(schema.serverSettings.settingKey, onboardingClaimSettingKey),
        }),
      );
      const allowed = row ? matchesStoredOnboardingClaim(row.value, claimToken, now) : false;
      assertCurrent(db);
      return allowed;
    },
    async currentStep(db: BackendContext["db"]) {
      assertCurrent(db);
      const value = await readAsync(() => getOnboardingOrFallback(db));
      assertCurrent(db);
      return value.current;
    },
  });
}

export function createSetupBackedContext(
  input: SetupBackedContextInput,
  admission: SetupReadAdmission,
  resources: SetupReadResources,
): BackendContext {
  if (input.signal !== admission.signal) throw new SetupReadAdmissionError("request-signal-mismatch");
  const assertCurrent = createAdmissionFence(admission);
  assertCurrent(admission.database);
  const setup = createSetupReadResources(admission, resources);
  const onboardingClaimToken = getOnboardingClaimTokenFromCookieHeader(input.request.headers.get("cookie"));
  assertCurrent(admission.database);
  return createBackendContext({
    request: input.request,
    signal: input.signal,
    effect: (effect) => {
      assertCurrent(admission.database);
      input.effect(effect);
    },
    onDispose: (dispose) => {
      assertCurrent(admission.database);
      input.onDispose(dispose);
    },
    principal: input.principal,
    deviceType: input.deviceType,
    baseUrl: input.baseUrl,
    demo: input.demo,
    reportError: input.reportError,
    flattenDomainError: input.flattenDomainError,
    db: admission.database,
    setup,
    onboardingClaimToken,
  });
}
