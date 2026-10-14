import { zfd } from "zod-form-data";
import { z } from "zod/v4";
import {
  certificateValidFileNameSchema,
  checkCertificateFile,
  rootCertificateFileNameSchema,
  rootCertificateMetadataSchema,
} from "@homarr/validation/certificates";

import { authenticatedProcedure, sourceProjectionMeta } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";
import type { SourceLeafPath } from "../port-map";
import { acquireCertificateAccess } from "./-certificates/bindings";
import type { CertificateProcedureResources } from "./-certificates/bindings";

export type { CertificateAuthority, CertificateProcedureResources } from "./-certificates/bindings";
export const certificateImplementedPaths = [
  "certificates.getCertificate",
  "certificates.ensureRootCertificate",
  "certificates.addCertificate",
  "certificates.trustHostnameMismatch",
  "certificates.removeTrustedHostname",
  "certificates.removeCertificate",
] satisfies readonly SourceLeafPath[];
export const certificatePendingPaths: readonly SourceLeafPath[] = [];

export function createCertificateProcedures(resources: CertificateProcedureResources) {
  function procedure(descriptor: SourceProcedureDescriptor & { access: { kind: "permission"; permission: "admin" } }) {
    return authenticatedProcedure(descriptor)
      .errors({
        CERTIFICATE_OPERATION_FAILED: {
          data: z.object({ mutationMayHaveCompleted: z.boolean() }),
        },
      })
      .use(async ({ context, next }) => {
        const certificateAccess = await acquireCertificateAccess(resources, context);
        try {
          return await next({ context: { certificateAccess } });
        } finally {
          await certificateAccess.releaseAsync();
        }
      });
  }
  return {
    getCertificate: procedure({
      path: "certificates.getCertificate",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/certificates/{fileName}",
            tags: ["certificates"],
            protect: true,
            summary: "Inspect a named custom root CA certificate",
            description:
              "Return public metadata or null when absent. Requires admin permission. Does not return PEM contents.",
          },
        }),
      )
      .input(z.object({ fileName: rootCertificateFileNameSchema }))
      .output(rootCertificateMetadataSchema.nullable())
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () => context.certificateAccess.service.getCertificate(context.certificateAccess.authority, input),
          false,
        ),
      ),
    ensureRootCertificate: procedure({
      path: "certificates.ensureRootCertificate",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "POST",
            path: "/api/certificates/root",
            tags: ["certificates"],
            protect: true,
            summary: "Ensure a named custom root CA certificate without overwriting",
            description:
              "Accept one currently valid self-signed PEM root CA (64 KiB maximum). Identical bytes are idempotent; different existing bytes return CONFLICT. Requires admin permission.",
          },
        }),
      )
      .input(
        z.object({
          fileName: rootCertificateFileNameSchema,
          certificate: z
            .string()
            .min(1)
            .max(64 * 1024),
        }),
      )
      .output(z.object({ created: z.boolean(), certificate: rootCertificateMetadataSchema }))
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () => context.certificateAccess.service.ensureRootCertificate(context.certificateAccess.authority, input),
          true,
        ),
      ),
    addCertificate: procedure({
      path: "certificates.addCertificate",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(zfd.formData({ file: zfd.file().check(checkCertificateFile) }))
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () =>
            context.certificateAccess.service.addCertificate(context.certificateAccess.authority, {
              file: context.certificateAccess.bindFile(input.file),
            }),
          true,
        ),
      ),
    trustHostnameMismatch: procedure({
      path: "certificates.trustHostnameMismatch",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ hostname: z.string(), certificate: z.string() }))
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () => context.certificateAccess.service.trustHostnameMismatch(context.certificateAccess.authority, input),
          true,
        ),
      ),
    removeTrustedHostname: procedure({
      path: "certificates.removeTrustedHostname",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ hostname: z.string(), thumbprint: z.string() }))
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () => context.certificateAccess.service.removeTrustedHostname(context.certificateAccess.authority, input),
          true,
        ),
      ),
    removeCertificate: procedure({
      path: "certificates.removeCertificate",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ fileName: certificateValidFileNameSchema }))
      .handler(({ context, input }) =>
        context.certificateAccess.runAsync(
          () => context.certificateAccess.service.removeCertificate(context.certificateAccess.authority, input),
          true,
        ),
      ),
  };
}
