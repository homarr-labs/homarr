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
    if (containsCredentialLikeValue(result.data)) {
      return { success: false, error: "Widget exports must not contain credentials or credential-like static values" };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Widget content is not valid JSON" };
  }
}

function containsCredentialLikeValue(widget: z.infer<typeof customWidgetImportSchema>) {
  const sensitiveName =
    /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;
  return (
    credentialTextPattern.test(widget.template) ||
    widget.sources.some((source) => {
      const url = new URL(source.baseUrl);
      return Boolean(url.username || url.password || url.search || url.hash);
    }) ||
    (widget.iconUrl
      ? [...new URL(widget.iconUrl).searchParams].some(
          ([name, value]) => sensitiveName.test(name) && value.trim().length > 0,
        )
      : false) ||
    widget.requests.some(
      (request) =>
        Object.entries(request.staticHeaders ?? {}).some(
          ([name, value]) =>
            (sensitiveName.test(name) && value.trim().length > 0) || /^\s*bearer\s+\S{8,}\s*$/iu.test(value),
        ) ||
        containsCredential(request.optionsBinding, "", sensitiveName) ||
        containsCredential(request.bodyTemplate, "", sensitiveName) ||
        containsCredential(request.queryTemplate, "", sensitiveName),
    ) ||
    containsCredential(widget.defaultOptions, "", sensitiveName)
  );
}

const credentialTextPattern =
  /(?:\bauthorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._~+/%-]{8,}|\b(?:api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|token|password|passwd|secret)\s*[:=]\s*["'][^"']{4,}["'])/iu;

function containsCredential(value: unknown, key: string, pattern: RegExp): boolean {
  if (pattern.test(key) && typeof value === "string" && value.trim().length > 0) return true;
  if (Array.isArray(value)) return value.some((entry) => containsCredential(entry, "", pattern));
  if (value === null || typeof value !== "object") return false;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") return false;
  return entries.some(([childKey, child]) => containsCredential(child, childKey, pattern));
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

export class WorkshopError extends Error {
  public constructor(
    public readonly code:
      | "authentication_required"
      | "forbidden"
      | "not_found"
      | "conflict"
      | "rate_limited"
      | "unavailable"
      | "unknown",
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "WorkshopError";
  }
}
