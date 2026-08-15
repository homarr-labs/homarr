// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const trustMaterial = vi.hoisted(() => ({
  certificates: [] as { content: string; fileName: string }[],
  hostnames: [] as { hostname: string; thumbprint: string; certificate: string }[],
  loadCalls: 0,
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  loadCustomRootCertificatesAsync: () => {
    trustMaterial.loadCalls++;
    return Promise.resolve(trustMaterial.certificates);
  },
  getTrustedCertificateHostnamesAsync: () => Promise.resolve(trustMaterial.hostnames),
  getAllTrustedCertificatesAsync: () => Promise.resolve(trustMaterial.certificates.map(({ content }) => content)),
}));

// The agent caches live at module scope, so every test needs a fresh copy of the module.
const importRequestModuleAsync = async () => {
  vi.resetModules();
  return await import("../../../infrastructure/http/request");
};

beforeEach(() => {
  trustMaterial.certificates = [];
  trustMaterial.hostnames = [];
  trustMaterial.loadCalls = 0;
});

describe("createCertificateAgentAsync", () => {
  test("should reuse one agent so requests share a connection pool", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();

    // Act
    const first = await createCertificateAgentAsync();
    const second = await createCertificateAgentAsync();

    // Assert
    expect(second).toBe(first);
  });

  test("should still read the trust material on every call", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();

    // Act
    await createCertificateAgentAsync();
    await createCertificateAgentAsync();

    // Assert
    expect(trustMaterial.loadCalls).toBe(2);
  });

  test("should replace the agent when a certificate is added", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();
    const before = await createCertificateAgentAsync();
    const closeSpy = vi.spyOn(before, "close");

    // Act
    trustMaterial.certificates = [{ fileName: "added.crt", content: "-----BEGIN CERTIFICATE-----" }];
    const after = await createCertificateAgentAsync();

    // Assert
    expect(after).not.toBe(before);
    expect(closeSpy).toHaveBeenCalled();
  });

  test("should replace the agent when a trusted hostname changes", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();
    const before = await createCertificateAgentAsync();

    // Act
    trustMaterial.hostnames = [{ hostname: "homarr.dev", thumbprint: "AA:BB", certificate: "cert" }];
    const after = await createCertificateAgentAsync();

    // Assert
    expect(after).not.toBe(before);
  });

  test("should not share an agent between different body timeouts", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();

    // Act
    const streaming = await createCertificateAgentAsync(undefined, { bodyTimeout: 0 });
    const regular = await createCertificateAgentAsync();

    // Assert
    expect(streaming).not.toBe(regular);
    expect(await createCertificateAgentAsync(undefined, { bodyTimeout: 0 })).toBe(streaming);
  });

  test("should give a caller supplying its own trust material a dedicated agent", async () => {
    // Arrange
    const { createCertificateAgentAsync } = await importRequestModuleAsync();
    const shared = await createCertificateAgentAsync();
    const override = { ca: "custom", checkServerIdentity: () => undefined };

    // Act
    const first = await createCertificateAgentAsync(override);
    const second = await createCertificateAgentAsync(override);

    // Assert
    expect(first).not.toBe(shared);
    expect(second).not.toBe(first);
    // The cached agent must survive a call that opted out of the cache.
    expect(await createCertificateAgentAsync()).toBe(shared);
  });
});

describe("createHttpsAgentAsync", () => {
  test("should reuse one agent so TLS sessions can be resumed", async () => {
    // Arrange
    const { createHttpsAgentAsync } = await importRequestModuleAsync();

    // Act
    const first = await createHttpsAgentAsync();
    const second = await createHttpsAgentAsync();

    // Assert
    expect(second).toBe(first);
  });

  test("should replace the agent when a certificate is added", async () => {
    // Arrange
    const { createHttpsAgentAsync } = await importRequestModuleAsync();
    const before = await createHttpsAgentAsync();

    // Act
    trustMaterial.certificates = [{ fileName: "added.crt", content: "-----BEGIN CERTIFICATE-----" }];
    const after = await createHttpsAgentAsync();

    // Assert
    expect(after).not.toBe(before);
  });

  test("should not destroy a superseded agent, which would abort requests in flight", async () => {
    // agent.destroy() destroys sockets that are currently in use, so destroying the old agent when an
    // admin adds a certificate could abort an in-flight calendar sync. These agents run without
    // keepAlive, so dropping the reference is enough.
    const { createHttpsAgentAsync } = await importRequestModuleAsync();
    const before = await createHttpsAgentAsync();
    // keepAlive is a real runtime property but is absent from @types/node's public Agent surface.
    // It is asserted because it is the premise of not destroying: without keepAlive, a dropped agent's
    // sockets close on their own once their response completes.
    expect((before as unknown as { keepAlive: boolean }).keepAlive).toBe(false);
    const destroySpy = vi.spyOn(before, "destroy");

    // Act
    trustMaterial.certificates = [{ fileName: "added.crt", content: "-----BEGIN CERTIFICATE-----" }];
    const after = await createHttpsAgentAsync();

    // Assert
    expect(after).not.toBe(before);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  test("should give a caller supplying an override a dedicated agent", async () => {
    // Arrange
    const { createHttpsAgentAsync } = await importRequestModuleAsync();
    const shared = await createHttpsAgentAsync();

    // Act
    const overridden = await createHttpsAgentAsync({ ca: "custom" });

    // Assert
    expect(overridden).not.toBe(shared);
    expect(await createHttpsAgentAsync()).toBe(shared);
  });
});
