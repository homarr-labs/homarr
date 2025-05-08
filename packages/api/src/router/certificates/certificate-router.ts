import { X509Certificate } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { addCustomRootCertificateAsync, removeCustomRootCertificateAsync } from "@homarr/certificates/server";
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
    .input(z.object({ hostname: z.string(), thumbprint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(trustedCertificateHostnames).values({
        hostname: input.hostname,
        thumbprint: input.thumbprint,
      });
    }),
  removeCertificate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ fileName: certificateValidFileNameSchema }))
    .mutation(async ({ input }) => {
      await removeCustomRootCertificateAsync(input.fileName);
    }),
});
