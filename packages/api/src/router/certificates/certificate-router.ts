import { X509Certificate } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { addCustomRootCertificateAsync, removeCustomRootCertificateAsync } from "@homarr/certificates/server";
import { and, eq } from "@homarr/db";
import { trustedCertificateHostnames } from "@homarr/db/schema";
import { certificateValidFileNameSchema, superRefineCertificateFile } from "@homarr/validation/certificates";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";

export const certificateRouter = createTRPCRouter({
  addCertificate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      zfd.formData({
        file: zfd.file().superRefine(superRefineCertificateFile),
      }),
    )
    .mutation(async ({ input }) => {
      const content = await input.file.text();

      // Validate the certificate
      try {
        new X509Certificate(content);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid certificate",
        });
      }

      await addCustomRootCertificateAsync(input.file.name, content);
    }),
  trustHostnameMismatch: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ hostname: z.string(), certificate: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Validate the certificate
      let x509Certificate: X509Certificate;
      try {
        x509Certificate = new X509Certificate(input.certificate);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid certificate",
        });
      }

      await ctx.db.insert(trustedCertificateHostnames).values({
        hostname: input.hostname,
        thumbprint: x509Certificate.fingerprint256,
        certificate: input.certificate,
      });
    }),
  removeTrustedHostname: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ hostname: z.string(), thumbprint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(trustedCertificateHostnames)
        .where(
          and(
            eq(trustedCertificateHostnames.hostname, input.hostname),
            eq(trustedCertificateHostnames.thumbprint, input.thumbprint),
          ),
        );
    }),
  removeCertificate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ fileName: certificateValidFileNameSchema }))
    .mutation(async ({ input, ctx }) => {
      const certificate = await removeCustomRootCertificateAsync(input.fileName);
      if (!certificate) return;

      // Delete all trusted hostnames for this certificate
      await ctx.db
        .delete(trustedCertificateHostnames)
        .where(eq(trustedCertificateHostnames.thumbprint, certificate.fingerprint256));
    }),
});
