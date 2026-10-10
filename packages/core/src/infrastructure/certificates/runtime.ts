import { createHash, X509Certificate } from "node:crypto";

import type { CertificateFileStore } from "./files";
import { describeRootCertificate, maxCertificateBytes, RootCertificateError } from "./files/root-certificate";
import type { TrustedCertificateHostname, TrustedCertificateHostnameStore } from "./hostnames/types";

export interface CertificateTrustMaterial {
  ca: string[];
  trustedHostnames: TrustedCertificateHostname[];
  version: string;
}

export type TrustMaterialChangedEffect =
  | { kind: "trust-material-changed"; version: string }
  | { kind: "trust-material-unavailable" };

export type CertificateListEntry =
  | { kind: "valid"; certificate: ReturnType<typeof describeRootCertificate> }
  | { kind: "invalid"; fileName: string; reason: string };

export interface CertificateServiceResources<TAuthority> {
  files: CertificateFileStore;
  hostnames: TrustedCertificateHostnameStore;
  requireAdminAsync: (authority: TAuthority) => Promise<void>;
  onTrustMaterialChangedAsync: (effect: TrustMaterialChangedEffect) => Promise<void>;
}

export const createCertificateTrustReader = (
  files: Pick<CertificateFileStore, "getAllTrustedCertificatesAsync">,
  hostnames: Pick<TrustedCertificateHostnameStore, "listAsync">,
) => {
  const readTrustMaterialAsync = async (): Promise<CertificateTrustMaterial> => {
    const [ca, trustedHostnames] = await Promise.all([files.getAllTrustedCertificatesAsync(), hostnames.listAsync()]);
    const version = createHash("sha256")
      .update(
        JSON.stringify([ca, trustedHostnames.map(({ hostname, thumbprint }) => [hostname, thumbprint]).toSorted()]),
      )
      .digest("hex");
    return { ca, trustedHostnames, version };
  };

  return { readTrustMaterialAsync };
};

export const createCertificateService = <TAuthority>(resources: CertificateServiceResources<TAuthority>) => {
  const reader = createCertificateTrustReader(resources.files, resources.hostnames);

  type MutationKind = "add-trust" | "revoke-trust";

  const publishEffectsAsync = async (previousVersion: string | undefined, kind: MutationKind) => {
    let after: CertificateTrustMaterial;
    try {
      after = await reader.readTrustMaterialAsync();
    } catch (error) {
      await resources.onTrustMaterialChangedAsync({ kind: "trust-material-unavailable" });
      if (kind === "add-trust") throw error;
      return;
    }
    if (previousVersion !== after.version) {
      await resources.onTrustMaterialChangedAsync({ kind: "trust-material-changed", version: after.version });
    }
  };

  const mutateAsync = async <T>(authority: TAuthority, kind: MutationKind, operation: () => Promise<T>): Promise<T> => {
    await resources.requireAdminAsync(authority);
    let previousVersion: string | undefined;
    const effectFailures: unknown[] = [];
    if (kind === "add-trust") {
      try {
        previousVersion = (await reader.readTrustMaterialAsync()).version;
      } catch (error) {
        try {
          await resources.onTrustMaterialChangedAsync({ kind: "trust-material-unavailable" });
        } catch (effectError) {
          effectFailures.push(effectError);
        }
        if (effectFailures.length) {
          const failure = new AggregateError([error, ...effectFailures], "Trust material and retirement failed", {
            cause: error,
          });
          throw failure;
        }
        throw error;
      }
    }
    let outcome: { kind: "success"; value: T } | { kind: "failed"; error: unknown };
    try {
      outcome = { kind: "success", value: await operation() };
    } catch (error) {
      outcome = { kind: "failed", error };
    }
    try {
      await publishEffectsAsync(previousVersion, kind);
    } catch (error) {
      effectFailures.push(error);
    }
    if (outcome.kind === "failed") {
      if (effectFailures.length)
        throw new AggregateError([outcome.error, ...effectFailures], "Trust mutation and retirement failed");
      throw outcome.error;
    }
    if (effectFailures.length)
      throw new AggregateError(effectFailures, "Trust mutation completed but retirement failed");
    return outcome.value;
  };

  const getCertificate = async (authority: TAuthority, input: { fileName: string }) => {
    await resources.requireAdminAsync(authority);
    return resources.files.getCustomRootCertificateAsync(input.fileName);
  };

  const ensureRootCertificate = (authority: TAuthority, input: { fileName: string; certificate: string }) =>
    mutateAsync(authority, "add-trust", () =>
      resources.files.ensureCustomRootCertificateAsync(input.fileName, input.certificate),
    );

  const addCertificate = (authority: TAuthority, input: { file: File }) =>
    mutateAsync(authority, "add-trust", async () => {
      if (input.file.size > maxCertificateBytes) {
        throw new RootCertificateError("BAD_REQUEST", "Expected one PEM root CA certificate, at most 64 KiB");
      }
      await resources.files.addCustomRootCertificateAsync(input.file.name, await input.file.text());
    });

  const trustHostnameMismatch = (authority: TAuthority, input: { hostname: string; certificate: string }) =>
    mutateAsync(authority, "add-trust", async () => {
      let certificate: X509Certificate;
      try {
        certificate = new X509Certificate(input.certificate);
      } catch {
        throw new RootCertificateError("BAD_REQUEST", "Invalid certificate");
      }
      await resources.hostnames.addAsync({
        hostname: input.hostname,
        thumbprint: certificate.fingerprint256,
        certificate: input.certificate,
      });
    });

  const removeTrustedHostname = (authority: TAuthority, input: { hostname: string; thumbprint: string }) =>
    mutateAsync(authority, "revoke-trust", () => resources.hostnames.removeAsync(input.hostname, input.thumbprint));

  const removeCertificate = (authority: TAuthority, input: { fileName: string }) =>
    mutateAsync(authority, "revoke-trust", async () => {
      const certificate = await resources.files.removeCustomRootCertificateAsync(input.fileName);
      if (!certificate) return;
      await resources.hostnames.removeByFingerprintAsync(certificate.fingerprint256);
    });

  const listCertificates = async (authority: TAuthority): Promise<CertificateListEntry[]> => {
    await resources.requireAdminAsync(authority);
    const certificates = await resources.files.loadCustomRootCertificatesAsync();
    return certificates.map(({ fileName, content }) => {
      try {
        return { kind: "valid", certificate: describeRootCertificate(fileName, Buffer.from(content), false) };
      } catch (error) {
        if (!(error instanceof RootCertificateError)) throw error;
        return { kind: "invalid", fileName, reason: error.message };
      }
    });
  };

  const listTrustedHostnames = async (authority: TAuthority) => {
    await resources.requireAdminAsync(authority);
    return (await resources.hostnames.listAsync()).map(({ hostname, thumbprint, certificate }) => {
      try {
        const parsed = new X509Certificate(certificate);
        return {
          kind: "valid" as const,
          hostname,
          thumbprint,
          validFrom: new Date(parsed.validFrom).toISOString(),
          validTo: new Date(parsed.validTo).toISOString(),
        };
      } catch {
        return { kind: "invalid" as const, hostname, thumbprint };
      }
    });
  };

  return {
    getCertificate,
    ensureRootCertificate,
    addCertificate,
    trustHostnameMismatch,
    removeTrustedHostname,
    removeCertificate,
    listCertificates,
    listTrustedHostnames,
  };
};
