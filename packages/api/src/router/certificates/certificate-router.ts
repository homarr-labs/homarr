import { z } from "zod";
import { zfd } from "zod-form-data";

import { addCustomRootCertificateAsync, removeCustomRootCertificateAsync } from "@homarr/certificates/server";
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
      await addCustomRootCertificateAsync(input.file.name, content);
    }),
  removeCertificate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ fileName: certificateValidFileNameSchema }))
    .mutation(async ({ input }) => {
      await removeCustomRootCertificateAsync(input.fileName);
    }),
});
