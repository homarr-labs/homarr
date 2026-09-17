import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([{ step: "finish" }]),
  };
  query.where.mockReturnValue(query);

  return {
    dbEnv: {
      DRIVER: "node-postgres",
      URL: "postgresql://homarr:test@localhost:5432/homarr",
    } as Record<string, unknown>,
    postgresPool: vi.fn(function PostgresPool() {
      return {};
    }),
    database: {
      select: vi.fn(() => ({ from: vi.fn(() => query) })),
    },
  };
});

vi.mock("@homarr/core/infrastructure/db/env", () => ({ dbEnv: mocks.dbEnv }));
vi.mock("pg", () => ({ Pool: mocks.postgresPool }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => mocks.database) }));
vi.mock("./proxy/postgresql", () => ({
  proxySchema: { onboarding: { step: {} }, serverSettings: { settingKey: {}, value: {} } },
}));

const initializeProxyReader = async () => {
  const { getOnboardingStepForProxyAsync } = await import("./proxy-reader");
  await getOnboardingStepForProxyAsync();
};

describe("proxy database pools", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const key of Object.keys(mocks.dbEnv)) delete mocks.dbEnv[key];
  });

  it("bounds PostgreSQL URL pools instead of falling back to the driver defaults", async () => {
    Object.assign(mocks.dbEnv, {
      DRIVER: "node-postgres",
      URL: "postgresql://homarr:test@localhost:5432/homarr",
    });

    await initializeProxyReader();

    expect(mocks.postgresPool).toHaveBeenCalledWith({
      connectionString: "postgresql://homarr:test@localhost:5432/homarr",
      max: 1,
      idleTimeoutMillis: 60_000,
      allowExitOnIdle: false,
    });
  });

  it("bounds PostgreSQL host pools instead of falling back to the driver defaults", async () => {
    Object.assign(mocks.dbEnv, {
      DRIVER: "node-postgres",
      HOST: "localhost",
      PORT: 5432,
      NAME: "homarr",
      USER: "homarr",
      PASSWORD: "test",
    });

    await initializeProxyReader();

    expect(mocks.postgresPool).toHaveBeenCalledWith(expect.objectContaining({ max: 1 }));
  });

  it("retries initialization after a transient driver failure", async () => {
    Object.assign(mocks.dbEnv, {
      DRIVER: "node-postgres",
      URL: "postgresql://homarr:test@localhost:5432/homarr",
    });
    mocks.postgresPool.mockImplementationOnce(function PostgresPool() {
      throw new Error("database unavailable");
    });

    const { getOnboardingStepForProxyAsync } = await import("./proxy-reader");

    await expect(getOnboardingStepForProxyAsync()).rejects.toThrow("database unavailable");
    await expect(getOnboardingStepForProxyAsync()).resolves.toBe("finish");
    expect(mocks.postgresPool).toHaveBeenCalledTimes(2);
  });
});
