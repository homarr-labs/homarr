import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import { z } from "zod/v4";

export const WORKSHOP_API_URL = "https://homarr.dev";
export const WORKSHOP_WEB_URL = "https://homarr.dev/workshop";
export const WORKSHOP_CSS_SCHEMA = "homarr-custom-css-v1";
export const MAX_WORKSHOP_CSS_LENGTH = 16_384;
export const MAX_WORKSHOP_CONTENT_LENGTH = 1_000_000;
export const MAX_WORKSHOP_SCREENSHOTS = 5;
export const MAX_WORKSHOP_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const WORKSHOP_REQUEST_TIMEOUT_MS = 8_000;
export const WORKSHOP_SCREENSHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const workshopReportCategorySchema = z.enum(["malicious", "spam", "copyright", "inappropriate", "other"]);
export const workshopSubmissionTypeSchema = z.enum(["customWidget", "customCss"]);
export type WorkshopSubmissionType = z.infer<typeof workshopSubmissionTypeSchema>;

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
  githubUsername: z.string().default(""),
  githubProfileUrl: z.string().default(""),
  isAdmin: z.boolean().default(false),
});
export type WorkshopUser = z.infer<typeof workshopUserSchema>;

const workshopSubmissionBaseSchema = z.object({
  id: z.string(),
  type: workshopSubmissionTypeSchema,
  title: z.string(),
  description: z.string().default(""),
  widgetSchema: z.string(),
  screenshots: workshopFileListSchema,
  author: z.string(),
  authorName: z.string(),
  authorAvatarUrl: z.string().default(""),
  authorGithubUsername: z.string().default(""),
  authorGithubProfileUrl: z.string().default(""),
  score: z.number().int(),
  upvotes: z.number().int(),
  downvotes: z.number().int(),
  commentCount: z.number().int().default(0),
  reportCount: z.number().int().default(0),
  revision: z.number().int().positive().default(1),
  changelog: z.string().default(""),
  outdated: z.boolean().default(false),
  created: z.string(),
  updated: z.string(),
});

export const workshopSubmissionSummarySchema = workshopSubmissionBaseSchema;
export type WorkshopSubmissionSummary = z.infer<typeof workshopSubmissionSummarySchema>;
export const workshopSubmissionDetailSchema = workshopSubmissionBaseSchema.extend({ content: z.string() });
export type WorkshopSubmissionDetail = z.infer<typeof workshopSubmissionDetailSchema>;

export const workshopSubmissionInputSchema = z
  .object({
    type: workshopSubmissionTypeSchema,
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(2_000).default(""),
    content: z.string().min(1).max(MAX_WORKSHOP_CONTENT_LENGTH),
    changelog: z.string().trim().max(2_000).default(""),
    outdated: z.boolean().default(false),
  })
  .superRefine((input, context) => {
    const result = validateWorkshopContent(input.type, input.content);
    if (!result.success) context.addIssue({ code: "custom", path: ["content"], message: result.error });
  });
export type WorkshopSubmissionInput = z.input<typeof workshopSubmissionInputSchema>;

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
  status: z.enum(["open", "dismissed"]).default("open"),
  created: z.string(),
  updated: z.string(),
});
export type WorkshopReport = z.infer<typeof workshopReportSchema>;

export const workshopCommentSchema = z.object({
  id: z.string(),
  submission: z.string(),
  author: z.string(),
  content: z.string().min(1).max(2_000),
  created: z.string(),
  updated: z.string(),
  authorName: z.string().default("Community member"),
  authorAvatarUrl: z.string().default(""),
  authorGithubProfileUrl: z.string().default(""),
});
export type WorkshopComment = z.infer<typeof workshopCommentSchema>;

export type WorkshopWidgetValidationResult =
  | { success: true; data: z.infer<typeof customWidgetImportSchema> }
  | { success: false; error: string };
export type WorkshopValidationResult =
  | { success: true; data: z.infer<typeof customWidgetImportSchema> | string }
  | { success: false; error: string };

export function validateWorkshopContent(type: WorkshopSubmissionType, content: string): WorkshopValidationResult {
  if (type === "customCss") {
    if (!content.trim()) return { success: false, error: "CSS cannot be empty" };
    if (content.length > MAX_WORKSHOP_CSS_LENGTH)
      return { success: false, error: `CSS must be at most ${MAX_WORKSHOP_CSS_LENGTH} characters` };
    return { success: true, data: content };
  }

  return validateWorkshopWidget(content);
}

export function validateWorkshopWidget(content: string): WorkshopWidgetValidationResult {
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

export function workshopExportFilename(title: string, type: WorkshopSubmissionType = "customWidget") {
  const safe =
    title
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "homarr-widget";
  return `${safe}.${type === "customCss" ? "css" : "json"}`;
}
