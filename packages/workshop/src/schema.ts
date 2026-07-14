import { customWidgetImportSchema } from "@homarr/validation/custom-widget";
import { z } from "zod";

export const WORKSHOP_API_URL = "https://homarr.dev";
export const WORKSHOP_WEB_URL = "https://homarr.dev/workshop";
export const WIDGET_SCHEMA_VERSION = "homarr-custom-widget-v2";
export const CSS_SCHEMA_VERSION = "homarr-custom-css-v1";
export const MAX_CSS_LENGTH = 16_384;
export const MAX_CONTENT_LENGTH = 1_000_000;
export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const WORKSHOP_REQUEST_TIMEOUT_MS = 8_000;
export const WORKSHOP_SCREENSHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const workshopSubmissionTypeSchema = z.enum(["widget", "css"]);
export type WorkshopSubmissionType = z.infer<typeof workshopSubmissionTypeSchema>;

export const workshopRoleSchema = z.enum(["member", "moderator", "admin"]);
export type WorkshopRole = z.infer<typeof workshopRoleSchema>;

export const workshopAccountStateSchema = z.enum(["active", "disabled"]);
export type WorkshopAccountState = z.infer<typeof workshopAccountStateSchema>;

export const workshopReportCategorySchema = z.enum(["malicious", "spam", "copyright", "inappropriate", "other"]);
export const workshopReportStatusSchema = z.enum(["open", "resolved", "dismissed"]);

export const workshopUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional().default(""),
  role: workshopRoleSchema,
  state: workshopAccountStateSchema,
});
export type WorkshopUser = z.infer<typeof workshopUserSchema>;

const submissionBaseSchema = z.object({
  id: z.string(),
  type: workshopSubmissionTypeSchema,
  title: z.string(),
  description: z.string().default(""),
  schemaVersion: z.string(),
  screenshots: z.array(z.string()).default([]),
  revision: z.number().int().positive(),
  changelog: z.string().default(""),
  author: z.string(),
  authorName: z.string(),
  score: z.number().int(),
  upvotes: z.number().int(),
  downvotes: z.number().int(),
  created: z.string(),
  updated: z.string(),
});

export const workshopSubmissionSummarySchema = submissionBaseSchema;
export type WorkshopSubmissionSummary = z.infer<typeof workshopSubmissionSummarySchema>;

export const workshopSubmissionDetailSchema = submissionBaseSchema.extend({ content: z.string() });
export type WorkshopSubmissionDetail = z.infer<typeof workshopSubmissionDetailSchema>;

export const workshopSubmissionInputSchema = z
  .object({
    type: workshopSubmissionTypeSchema,
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(2_000).default(""),
    content: z.string().min(1).max(MAX_CONTENT_LENGTH),
    changelog: z.string().trim().max(2_000).default(""),
  })
  .superRefine((input, context) => {
    const result = validateWorkshopContent(input.type, input.content);
    if (!result.success) context.addIssue({ code: "custom", message: result.error, path: ["content"] });
  });
export type WorkshopSubmissionInput = z.infer<typeof workshopSubmissionInputSchema>;

export const workshopScreenshotSchema = z.object({
  size: z.number().max(MAX_SCREENSHOT_BYTES, "Each screenshot must be at most 5 MiB"),
  type: z.enum(WORKSHOP_SCREENSHOT_MIME_TYPES, { error: "Screenshots must be PNG, JPEG, or WebP" }),
});
export const workshopScreenshotsSchema = z.array(workshopScreenshotSchema).max(MAX_SCREENSHOTS);

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
  category: workshopReportCategorySchema,
  explanation: z.string(),
  status: workshopReportStatusSchema,
  created: z.string(),
  updated: z.string(),
});
export type WorkshopReport = z.infer<typeof workshopReportSchema>;

export const workshopModerationActionSchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.enum(["remove_submission", "set_account_state", "set_role", "resolve_report"]),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  snapshot: z.string().default(""),
  created: z.string(),
});
export type WorkshopModerationAction = z.infer<typeof workshopModerationActionSchema>;

export const workshopErrorCodeSchema = z.enum([
  "authentication_required",
  "account_disabled",
  "forbidden",
  "not_found",
  "invalid_submission",
  "conflict",
  "rate_limited",
  "unavailable",
  "unknown",
]);
export type WorkshopErrorCode = z.infer<typeof workshopErrorCodeSchema>;

export class WorkshopError extends Error {
  constructor(
    public readonly code: WorkshopErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "WorkshopError";
  }
}

export type WorkshopValidationResult = { success: true; data: unknown } | { success: false; error: string };

export function validateWorkshopContent(type: WorkshopSubmissionType, content: string): WorkshopValidationResult {
  if (type === "css") {
    if (!content.trim()) return { success: false, error: "CSS cannot be empty" };
    if (content.length > MAX_CSS_LENGTH) {
      return { success: false, error: `CSS must be at most ${MAX_CSS_LENGTH} characters` };
    }
    return { success: true, data: content };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    const result = customWidgetImportSchema.safeParse(parsed);
    if (!result.success || result.data.$schema !== WIDGET_SCHEMA_VERSION) {
      return {
        success: false,
        error: result.success
          ? "Widget schema identifier is required"
          : (result.error.issues[0]?.message ?? "Invalid widget"),
      };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Widget content is not valid JSON" };
  }
}

export const schemaVersionForType = (type: WorkshopSubmissionType) =>
  type === "widget" ? WIDGET_SCHEMA_VERSION : CSS_SCHEMA_VERSION;

export function workshopExportFilename(title: string, type: WorkshopSubmissionType) {
  let safeTitle = "";
  let separatorPending = false;

  for (const character of title.trim().toLowerCase()) {
    const isLetter = character >= "a" && character <= "z";
    const isNumber = character >= "0" && character <= "9";
    if (isLetter || isNumber || character === "_") {
      if (separatorPending && safeTitle.length > 0) safeTitle += "-";
      safeTitle += character;
      separatorPending = false;
    } else {
      separatorPending = safeTitle.length > 0;
    }
  }

  safeTitle ||= "homarr-workshop";
  return `${safeTitle}.${type === "widget" ? "json" : "css"}`;
}
