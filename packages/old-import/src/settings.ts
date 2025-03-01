import { z } from "zod";
import { zfd } from "zod-form-data";

import { validation } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

export const sidebarBehaviours = ["remove-items", "last-section"] as const;
export const defaultSidebarBehaviour = "last-section";
export type SidebarBehaviour = (typeof sidebarBehaviours)[number];

export const oldmarrImportConfigurationSchema = z.object({
  name: validation.board.name,
  onlyImportApps: z.boolean().default(false),
  sidebarBehaviour: z.enum(sidebarBehaviours).default(defaultSidebarBehaviour),
});

export type OldmarrImportConfiguration = z.infer<typeof oldmarrImportConfigurationSchema>;

export const initialOldmarrImportSettings = oldmarrImportConfigurationSchema.pick({
  onlyImportApps: true,
  sidebarBehaviour: true,
});

export type InitialOldmarrImportSettings = z.infer<typeof initialOldmarrImportSettings>;

export const superRefineJsonImportFile = (value: File | null, context: z.RefinementCtx) => {
  if (!value) {
    return context.addIssue({
      code: "invalid_type",
      expected: "object",
      received: "null",
    });
  }

  if (value.type !== "application/json") {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileType",
        params: { expected: "JSON" },
      }),
    });
  }

  if (value.size > 1024 * 1024) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "fileTooLarge",
        params: { maxSize: "1 MB" },
      }),
    });
  }

  return null;
};

export const importJsonFileSchema = zfd.formData({
  file: zfd.file().superRefine(superRefineJsonImportFile),
  configuration: zfd.json(oldmarrImportConfigurationSchema),
});
