import { ORPCError } from "@orpc/server";
import { requireGlobalPermission, snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { PolicyIdentity } from "@homarr/auth/nitro/policy";
import {
  createCertificateService,
  createCertificateTrustReader,
  RootCertificateError,
} from "@homarr/core/infrastructure/certificates/resources";
import type {
  CertificateFileStore,
  TrustedCertificateHostnameStore,
  TrustMaterialChangedEffect,
} from "@homarr/core/infrastructure/certificates/resources";

import type { AuthenticatedBackendContext } from "../../context";

export interface CertificateAuthority {
  readonly identity: PolicyIdentity;
  readonly signal: AbortSignal;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface CertificateProcedureResources {
  readonly files: CertificateFileStore;
  acquireAuthorityAsync(context: AuthenticatedBackendContext): Promise<CertificateAuthority>;
  createHostnameStore(context: AuthenticatedBackendContext): TrustedCertificateHostnameStore;
  retireTrustMaterialAsync(effect: TrustMaterialChangedEffect): Promise<void>;
}

export class CertificateOperationError extends ORPCError<
  "CERTIFICATE_OPERATION_FAILED",
  { mutationMayHaveCompleted: boolean }
> {
  constructor(message: string, mutationMayHaveCompleted: boolean) {
    super("CERTIFICATE_OPERATION_FAILED", { message, data: { mutationMayHaveCompleted } });
  }
}

export async function acquireCertificateAccess(
  resources: CertificateProcedureResources,
  context: AuthenticatedBackendContext,
) {
  let authority: CertificateAuthority;
  try {
    authority = await resources.acquireAuthorityAsync(context);
  } catch {
    throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
  }
  const identity = snapshotPolicyIdentity(authority.identity);
  let mutationStarted = false;
  let postMutationFenceFailed = false;
  let retirementAttempted = false;
  let retirementFailed = false;

  async function assertCurrentAsync() {
    if (context.signal.aborted || authority.signal.aborted)
      throw new ORPCError("PRECONDITION_FAILED", { message: "Certificate operation was cancelled" });
    try {
      await authority.assertCurrentAsync();
    } catch {
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
    }
    if (context.signal.aborted || authority.signal.aborted)
      throw new ORPCError("PRECONDITION_FAILED", { message: "Certificate operation was cancelled" });
    if (requireGlobalPermission(identity, "admin").type === "deny")
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
    if (identity.type !== "authenticated" || identity.userId !== context.principal.user.id)
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
  }

  async function fenceAsync() {
    if (!mutationStarted) return assertCurrentAsync();
    try {
      await assertCurrentAsync();
    } catch {
      postMutationFenceFailed = true;
    }
  }

  async function readAsync<Value>(operation: () => Promise<Value>) {
    await fenceAsync();
    const result = await operation();
    await fenceAsync();
    return result;
  }

  async function mutateAsync<Value>(operation: () => Promise<Value>, revocationCleanup = false) {
    if (mutationStarted && revocationCleanup) await fenceAsync();
    else await assertCurrentAsync();
    mutationStarted = true;
    return operation();
  }

  async function retireAsync(effect: TrustMaterialChangedEffect) {
    await fenceAsync();
    retirementAttempted = true;
    try {
      await resources.retireTrustMaterialAsync(effect);
    } catch {
      retirementFailed = true;
      throw new CertificateOperationError(
        "Certificate mutation may have completed but trust retirement failed",
        mutationStarted,
      );
    }
    await fenceAsync();
  }

  async function releaseAsync() {
    try {
      await authority.releaseAsync();
    } catch {
      throw new CertificateOperationError(
        mutationStarted
          ? "Certificate mutation may have completed; authority release failed"
          : "Certificate authority release failed",
        mutationStarted,
      );
    }
  }

  try {
    await assertCurrentAsync();
  } catch (error) {
    await releaseAsync();
    throw error;
  }
  let hostnames: TrustedCertificateHostnameStore;
  try {
    hostnames = resources.createHostnameStore(context);
  } catch {
    await releaseAsync();
    throw new CertificateOperationError("Certificate resources are unavailable", false);
  }
  const files: CertificateFileStore = {
    getCustomRootCertificateAsync: (name) => readAsync(() => resources.files.getCustomRootCertificateAsync(name)),
    ensureCustomRootCertificateAsync: (name, pem) =>
      mutateAsync(() => resources.files.ensureCustomRootCertificateAsync(name, pem)),
    addCustomRootCertificateAsync: (name, pem) =>
      mutateAsync(() => resources.files.addCustomRootCertificateAsync(name, pem)),
    removeCustomRootCertificateAsync: (name) =>
      mutateAsync(() => resources.files.removeCustomRootCertificateAsync(name)),
    loadCustomRootCertificatesAsync: () => readAsync(() => resources.files.loadCustomRootCertificatesAsync()),
    getAllTrustedCertificatesAsync: () => readAsync(() => resources.files.getAllTrustedCertificatesAsync()),
  };
  const store: TrustedCertificateHostnameStore = {
    listAsync: () => readAsync(() => hostnames.listAsync()),
    addAsync: (grant) => mutateAsync(() => hostnames.addAsync(grant)),
    removeAsync: (hostname, fingerprint) => mutateAsync(() => hostnames.removeAsync(hostname, fingerprint)),
    removeByFingerprintAsync: (fingerprint) => mutateAsync(() => hostnames.removeByFingerprintAsync(fingerprint), true),
  };
  const service = createCertificateService({
    files,
    hostnames: store,
    requireAdminAsync: async (current: CertificateAuthority) => {
      if (current !== authority) throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
      await assertCurrentAsync();
    },
    onTrustMaterialChangedAsync: retireAsync,
  });
  const reader = createCertificateTrustReader(files, store);

  function bindFile(file: File): File {
    return new Proxy(file, {
      get(target, property): unknown {
        if (property === "text")
          return async () => {
            await assertCurrentAsync();
            const text = await target.text();
            await assertCurrentAsync();
            return text;
          };
        return Reflect.get(target, property, target);
      },
    });
  }

  async function runAsync<Value>(operation: () => Promise<Value>, mutation: boolean): Promise<Value> {
    let outcome: { kind: "success"; value: Value } | { kind: "failed"; error: unknown };
    try {
      await assertCurrentAsync();
      outcome = { kind: "success", value: await operation() };
    } catch (error) {
      outcome = { kind: "failed", error };
    }
    if (mutation && mutationStarted && !retirementAttempted) {
      let effect: TrustMaterialChangedEffect;
      try {
        effect = { kind: "trust-material-changed", version: (await reader.readTrustMaterialAsync()).version };
      } catch {
        effect = { kind: "trust-material-unavailable" };
      }
      try {
        await retireAsync(effect);
      } catch (error) {
        outcome = { kind: "failed", error };
      }
    }
    await fenceAsync();
    if (postMutationFenceFailed)
      throw new CertificateOperationError(
        "Certificate mutation may have completed; current authority or cancellation changed",
        true,
      );
    if (retirementFailed)
      throw new CertificateOperationError(
        "Certificate mutation may have completed but trust retirement failed",
        mutationStarted,
      );
    if (outcome.kind === "success") return outcome.value;
    if (outcome.error instanceof RootCertificateError)
      throw new ORPCError(outcome.error.code, { message: outcome.error.message });
    if (
      outcome.error instanceof ORPCError &&
      (outcome.error.code === "FORBIDDEN" || outcome.error.code === "PRECONDITION_FAILED")
    )
      throw new ORPCError(outcome.error.code, { message: outcome.error.message });
    throw new CertificateOperationError("Certificate operation failed", mutationStarted);
  }

  return { authority, service, bindFile, runAsync, releaseAsync };
}
