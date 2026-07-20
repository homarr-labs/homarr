import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import { z } from "zod/v4";

export const WORKSHOP_API_URL = "https://homarr.dev";
export const WORKSHOP_WEB_URL = "https://homarr.dev/workshop";
export const MAX_WORKSHOP_CONTENT_LENGTH = 1_000_000;
export const MAX_WORKSHOP_SCREENSHOTS = 5;
export const MAX_WORKSHOP_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const WORKSHOP_REQUEST_TIMEOUT_MS = 8_000;
export const WORKSHOP_SCREENSHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const workshopReportCategorySchema = z.enum(["malicious", "spam", "copyright", "inappropriate", "other"]);

const workshopFileListSchema = z
  .preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }, z.array(z.string()))
  .default([]);

export const workshopUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().default(""),
  isAdmin: z.boolean().default(false),
});
export type WorkshopUser = z.infer<typeof workshopUserSchema>;

const workshopSubmissionBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  widgetSchema: z.string(),
  screenshots: workshopFileListSchema,
  author: z.string(),
  authorName: z.string(),
  score: z.number().int(),
  upvotes: z.number().int(),
  downvotes: z.number().int(),
  created: z.string(),
  updated: z.string(),
});

export const workshopSubmissionSummarySchema = workshopSubmissionBaseSchema;
export type WorkshopSubmissionSummary = z.infer<typeof workshopSubmissionSummarySchema>;
export const workshopSubmissionDetailSchema = workshopSubmissionBaseSchema.extend({ content: z.string() });
export type WorkshopSubmissionDetail = z.infer<typeof workshopSubmissionDetailSchema>;

export const workshopSubmissionInputSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(2_000).default(""),
    content: z.string().min(1).max(MAX_WORKSHOP_CONTENT_LENGTH),
  })
  .superRefine((input, context) => {
    const result = validateWorkshopWidget(input.content);
    if (!result.success) context.addIssue({ code: "custom", path: ["content"], message: result.error });
  });
export type WorkshopSubmissionInput = z.infer<typeof workshopSubmissionInputSchema>;

export const workshopScreenshotsSchema = z
  .array(
    z.object({
      size: z.number().max(MAX_WORKSHOP_SCREENSHOT_BYTES),
      type: z.enum(WORKSHOP_SCREENSHOT_MIME_TYPES),
    }),
  )
  .max(MAX_WORKSHOP_SCREENSHOTS);

export const workshopVoteSchema = z.object({
  id: z.string(),
  submission: z.string(),
  user: z.string(),
  value: z.union([z.literal(1), z.literal(-1)]),
});
export type WorkshopVote = z.infer<typeof workshopVoteSchema>;

export const workshopReportSchema = z.object({
  id: z.string(),
  submission: z.string(),
  reporter: z.string(),
  reporterName: z.string().default("Community member"),
  submissionTitle: z.string().default("Deleted submission"),
  category: workshopReportCategorySchema,
  explanation: z.string(),
  created: z.string(),
  updated: z.string(),
});
export type WorkshopReport = z.infer<typeof workshopReportSchema>;

export type WorkshopValidationResult =
  | { success: true; data: z.infer<typeof customWidgetImportSchema> }
  | { success: false; error: string };

export function validateWorkshopWidget(content: string): WorkshopValidationResult {
  try {
    const parsed: unknown = JSON.parse(content);
    const result = customWidgetImportSchema.safeParse(parsed);
    if (!result.success) {
      const error = result.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "widget"}: ${issue.message}`)
        .join("\n");
      return { success: false, error: error || "Invalid widget" };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Widget content is not valid JSON" };
  }
}

export function workshopExportFilename(title: string) {
  const safe =
    title
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "homarr-widget";
  return `${safe}.json`;
}
