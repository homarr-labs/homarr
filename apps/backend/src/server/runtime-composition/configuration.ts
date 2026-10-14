import { isAbsolute, normalize } from "node:path";

import type { PublicHostConfiguration } from "./contracts";

export function captureHostConfiguration(input: PublicHostConfiguration): PublicHostConfiguration {
  const origin = new URL(input.baseUrl);
  if (
    (origin.protocol !== "http:" && origin.protocol !== "https:") ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new TypeError("A trusted HTTP(S) origin is required");
  }
  const basePath = input.basePath;
  if (
    basePath !== "" &&
    (!basePath.startsWith("/") ||
      basePath.endsWith("/") ||
      basePath.includes("//") ||
      /[?#%\\\s]/u.test(basePath) ||
      basePath.split("/").some((segment) => segment === "." || segment === ".."))
  ) {
    throw new TypeError("The trusted base path must be empty or a normalized absolute URL path");
  }
  const { engine, path, mode, migrationsFolder, epochInitializationTimeoutMs } = input.persistence;
  const persistence = Object.freeze({ engine, path, mode, migrationsFolder, epochInitializationTimeoutMs });
  if (
    persistence.engine !== "sqlite" ||
    (persistence.mode !== "fresh" && persistence.mode !== "existing") ||
    !isAbsolute(persistence.path) ||
    !isAbsolute(persistence.migrationsFolder) ||
    normalize(persistence.path) !== persistence.path ||
    normalize(persistence.migrationsFolder) !== persistence.migrationsFolder ||
    persistence.path === persistence.migrationsFolder
  ) {
    throw new TypeError("Main persistence requires explicit absolute SQLite and migration asset paths");
  }
  if (
    !Number.isSafeInteger(epochInitializationTimeoutMs) ||
    epochInitializationTimeoutMs < 1 ||
    epochInitializationTimeoutMs > 2147483647
  ) {
    throw new TypeError("An explicit positive supported epoch initialization timeout is required");
  }
  if (!Number.isSafeInteger(input.localeMutationBodyLimit) || input.localeMutationBodyLimit < 1) {
    throw new TypeError("An explicit positive locale mutation body limit is required");
  }
  return Object.freeze({ ...input, persistence });
}

export function hostPath(configuration: Pick<PublicHostConfiguration, "basePath">, path: `/${string}`): `/${string}` {
  return `${configuration.basePath as "" | `/${string}`}${path}`;
}
