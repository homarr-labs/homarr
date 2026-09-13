import { z } from "zod/v4";

const packagePath = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      !path.includes("\\") &&
      !path.includes("\0") &&
      path.split("/").every((part) => part !== ".." && part !== "." && part.length > 0) &&
      !["__proto__", "prototype", "constructor"].includes(path),
  );

export const packageDraftToolContracts = {
  read_widget_package_draft: {
    description:
      "Read the currently open trusted widget package workspace draft, its revision, selected source files, validation diagnostics, public SDK guide and exact-candidate preview evidence. This is the unsaved browser draft, not the installed release. Connection bindings, credentials and runtime response data are excluded. Read before proposing edits. Request omitted files separately. An optional reference returns an inspectable source example; reading never executes code. Use these v3 tools instead of Custom JSX v2 authoring tools in the package workspace.",
    parameters: z.object({
      paths: z.array(packagePath).max(64).optional(),
      reference: z
        .enum([
          "clock",
          "timer",
          "beszel",
          "checklist",
          "downloads",
          "sonarr",
          "rack",
          "backup",
          "household",
          "overview",
          "media",
        ])
        .optional(),
    }),
  },
  propose_widget_package_changes: {
    description:
      "Propose a patch against the revision returned by read_widget_package_draft. The owner reviews before/after source in the Assistant and explicitly applies or rejects it. Applied changes form one Undo step in the visible draft. Supply complete contents only for changed files; null deletes a file. metadata is the complete widget.json content excluding files. Preserve untouched content and dependencies. This does not save, trust, preview, activate, install or publish anything. Never claim a proposal has executed. Re-read the draft after it changes. Files containing redacted credentials cannot be replaced through this tool; move credentials to local connections manually first.",
    parameters: z.object({
      revision: z.string().min(1).max(128),
      summary: z.string().trim().min(1).max(800),
      name: z.string().trim().min(1).max(128).optional(),
      metadata: z.string().max(100_000).optional(),
      files: z
        .record(packagePath, z.string().max(180_000).nullable())
        .refine((files) => Object.keys(files).length <= 64),
    }),
  },
} as const;

export type ReadPackageDraftArgs = z.infer<typeof packageDraftToolContracts.read_widget_package_draft.parameters>;
export type ProposePackageChangesArgs = z.infer<
  typeof packageDraftToolContracts.propose_widget_package_changes.parameters
>;
export type PackageChangesResult = { applied: boolean; revision?: string; error?: string; cancelled?: boolean };
export interface PackageDraftReview {
  available: boolean;
  error?: string;
  changes: { path: string; before: string; after: string }[];
}
