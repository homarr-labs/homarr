import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([{ step: "finish" }]),
  };
  query.where.mockReturnValue(query);

  return {
    dbEnv: {
      DRIVER: "mysql2",
      URL: "mysql://homarr:test@localhost:3306/homarr",
    } as Record<string, unknown>,
    mysqlCreatePool: vi.fn(() => ({})),
    postgresPool: vi.fn(function PostgresPool() {
      return {};
    }),
    database: {
      select: vi.fn(() => ({ from: vi.fn(() => query) })),
    },
  };
});

vi.mock("@homarr/core/infrastructure/db/env", () => ({ dbEnv: mocks.dbEnv }));
vi.mock("mysql2", () => ({ default: { createPool: mocks.mysqlCreatePool } }));
vi.mock("pg", () => ({ Pool: mocks.postgresPool }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => mocks.database) }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => mocks.database) }));
vi.mock("./proxy/mysql", () => ({
  proxySchema: { onboarding: { step: {} }, serverSettings: { settingKey: {}, value: {} } },
}));
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

  it("bounds MySQL URL pools instead of falling back to the driver defaults", async () => {
    Object.assign(mocks.dbEnv, {
      DRIVER: "mysql2",
      URL: "mysql://homarr:test@localhost:3306/homarr",
    });

    await initializeProxyReader();

    expect(mocks.mysqlCreatePool).toHaveBeenCalledWith({
      uri: "mysql://homarr:test@localhost:3306/homarr",
      connectionLimit: 1,
      maxIdle: 1,
      idleTimeout: 60_000,
      enableKeepAlive: true,
    });
  });

  it("bounds MySQL host pools instead of falling back to the driver defaults", async () => {
    Object.assign(mocks.dbEnv, {
      DRIVER: "mysql2",
      HOST: "localhost",
      PORT: 3306,
      NAME: "homarr",
      USER: "homarr",
      PASSWORD: "test",
    });

    await initializeProxyReader();

    expect(mocks.mysqlCreatePool).toHaveBeenCalledWith(expect.objectContaining({ connectionLimit: 1, maxIdle: 1 }));
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
});
