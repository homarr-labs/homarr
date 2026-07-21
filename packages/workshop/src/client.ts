import PocketBase, { ClientResponseError } from "pocketbase";

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";

import type {
  WorkshopComment,
  WorkshopReport,
  WorkshopSubmissionDetail,
  WorkshopSubmissionInput,
  WorkshopSubmissionSummary,
  WorkshopSubmissionType,
  WorkshopUser,
  WorkshopVote,
} from "./schema";
import {
  WORKSHOP_API_URL,
  WORKSHOP_REQUEST_TIMEOUT_MS,
  workshopCommentSchema,
  workshopReportSchema,
  workshopSubmissionDetailSchema,
  workshopSubmissionSummarySchema,
  workshopSubmissionInputSchema,
  workshopScreenshotsSchema,
  workshopUserSchema,
  workshopVoteSchema,
  WORKSHOP_CSS_SCHEMA,
} from "./schema";

export interface WorkshopListOptions {
  page?: number;
  perPage?: number;
  sort?: "top" | "newest" | "recent" | "discussed";
  search?: string;
  author?: string;
  type?: WorkshopSubmissionType | "all";
  includeOutdated?: boolean;
  signal?: AbortSignal;
}

export interface WorkshopPage<T> {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

const requestSignal = (signal?: AbortSignal) =>
  AbortSignal.any(
    signal
      ? [signal, AbortSignal.timeout(WORKSHOP_REQUEST_TIMEOUT_MS)]
      : [AbortSignal.timeout(WORKSHOP_REQUEST_TIMEOUT_MS)],
  );

function oauthText(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function githubProfile(meta: Record<string, unknown> | undefined, record: Record<string, unknown>) {
  const rawUser =
    meta?.rawUser && typeof meta.rawUser === "object" ? (meta.rawUser as Record<string, unknown>) : undefined;
  const displayName = oauthText(meta?.name, meta?.username, rawUser?.name, rawUser?.login);
  const avatarUrl = oauthText(meta?.avatarUrl, meta?.avatarURL, rawUser?.avatar_url);
  const githubUsername = oauthText(meta?.username, rawUser?.login);
  return {
    displayName: (displayName ?? `GitHub user ${String(record.id ?? "").slice(0, 8)}`).slice(0, 100),
    avatarUrl: avatarUrl?.startsWith("https://") ? avatarUrl : undefined,
    githubUsername,
    githubProfileUrl: githubUsername ? `https://github.com/${encodeURIComponent(githubUsername)}` : undefined,
  };
}

const listingSort = (sort: WorkshopListOptions["sort"]) => {
  if (sort === "newest") return "-created";
  if (sort === "recent") return "-updated";
  if (sort === "discussed") return "-commentCount,-created";
  return "-score,-created";
};

function workshopError(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  if (/popup.*block|blocked.*popup/iu.test(rawMessage))
    return new Error("GitHub sign-in popup was blocked. Allow popups for this site and try again.", { cause: error });
  if (/cancel|closed.*popup|popup.*closed/iu.test(rawMessage))
    return new Error("GitHub sign-in was cancelled before it completed.", { cause: error });
  if (
    /provider|oauth|redirect|callback|client.?id/iu.test(rawMessage) &&
    /invalid|missing|not found|failed/iu.test(rawMessage)
  )
    return new Error("GitHub sign-in is not configured correctly on the Workshop server.", { cause: error });
  if (error instanceof ClientResponseError) {
    const sdkMessage = error.data?.message || error.message;
    const originalMessage =
      error.originalError instanceof Error ? error.originalError.message : String(error.originalError?.message ?? "");
    const message = !sdkMessage || sdkMessage === "Something went wrong." ? originalMessage || fallback : sdkMessage;
    return new Error(message, { cause: error });
  }
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
    return new Error(`${fallback}. The request timed out.`, { cause: error });
  return error instanceof Error ? error : new Error(fallback);
}

export class WorkshopClient {
  public readonly pocketBase: PocketBase;

  public constructor(public readonly baseUrl = WORKSHOP_API_URL) {
    this.pocketBase = new PocketBase(baseUrl.replace(/\/$/u, ""));
  }

  public get currentUser(): WorkshopUser | null {
    const record = this.pocketBase.authStore.record;
    if (!record) return null;
    return workshopUserSchema.parse({
      id: record.id,
      displayName: record.displayName || record.name || record.username || "Community member",
      avatarUrl: record.avatarUrl || (record.avatar ? this.pocketBase.files.getURL(record, record.avatar) : ""),
      githubUsername: record.githubUsername || record.username || "",
      githubProfileUrl: record.githubProfileUrl || "",
      isAdmin: record.isAdmin === true,
    });
  }

  public subscribeToAuth(listener: (user: WorkshopUser | null) => void) {
    return this.pocketBase.authStore.onChange(() => listener(this.currentUser), true);
  }

  public async refreshAuth() {
    if (!this.pocketBase.authStore.isValid) return null;
    try {
      await this.pocketBase.collection("users").authRefresh();
      return this.currentUser;
    } catch (error) {
      if (error instanceof ClientResponseError && (error.status === 401 || error.status === 403)) {
        this.pocketBase.authStore.clear();
        return null;
      }
      return this.currentUser;
    }
  }

  public async signInWithGitHub() {
    try {
      const auth = await this.pocketBase.collection("users").authWithOAuth2({
        provider: "github",
        createData: { displayName: "GitHub user" },
      });
      const profile = githubProfile(auth.meta, auth.record);
      const updated = await this.pocketBase.collection("users").update(auth.record.id, profile);
      this.pocketBase.authStore.save(auth.token, updated);
      return this.currentUser;
    } catch (error) {
      throw workshopError(error, "GitHub sign-in failed");
    }
  }

  public signOut() {
    this.pocketBase.authStore.clear();
  }

  public async list(options: WorkshopListOptions = {}): Promise<WorkshopPage<WorkshopSubmissionSummary>> {
    const filters: string[] = [];
    if (options.type && options.type !== "all")
      filters.push(this.pocketBase.filter("type = {:type}", { type: options.type }));
    if (options.search?.trim())
      filters.push(this.pocketBase.filter("title ~ {:search}", { search: options.search.trim() }));
    if (options.author) filters.push(this.pocketBase.filter("author = {:author}", { author: options.author }));
    if (options.includeOutdated === false) filters.push("outdated = false");
    try {
      const result = await this.pocketBase
        .collection("workshop_listings")
        .getList(options.page ?? 1, options.perPage ?? 24, {
          filter: filters.join(" && "),
          sort: listingSort(options.sort),
          signal: requestSignal(options.signal),
        });
      return { ...result, items: result.items.map((item) => workshopSubmissionSummarySchema.parse(item)) };
    } catch (error) {
      throw workshopError(error, "Failed to load Workshop submissions");
    }
  }

  public async listAll(options: Omit<WorkshopListOptions, "page" | "perPage"> = {}) {
    const filters: string[] = [];
    if (options.type && options.type !== "all")
      filters.push(this.pocketBase.filter("type = {:type}", { type: options.type }));
    if (options.search?.trim())
      filters.push(this.pocketBase.filter("title ~ {:search}", { search: options.search.trim() }));
    if (options.author) filters.push(this.pocketBase.filter("author = {:author}", { author: options.author }));
    if (options.includeOutdated === false) filters.push("outdated = false");
    try {
      const items = await this.pocketBase.collection("workshop_listings").getFullList({
        batch: 200,
        filter: filters.join(" && "),
        sort: listingSort(options.sort),
        signal: requestSignal(options.signal),
      });
      return items.map((item) => workshopSubmissionSummarySchema.parse(item));
    } catch (error) {
      throw workshopError(error, "Failed to load Workshop submissions");
    }
  }

  public async get(id: string, signal?: AbortSignal): Promise<WorkshopSubmissionDetail> {
    try {
      const [submission, listing] = await Promise.all([
        this.pocketBase.collection("submissions").getOne(id, { signal: requestSignal(signal) }),
        this.pocketBase.collection("workshop_listings").getOne(id, { signal: requestSignal(signal) }),
      ]);
      return workshopSubmissionDetailSchema.parse({ ...submission, ...listing, content: submission.content });
    } catch (error) {
      throw workshopError(error, "Submission not found");
    }
  }

  public fileUrl(submissionId: string, filename: string, thumb?: string) {
    return `${this.baseUrl}/api/files/submissions/${submissionId}/${encodeURIComponent(filename)}${thumb ? `?thumb=${encodeURIComponent(thumb)}` : ""}`;
  }

  public async create(input: WorkshopSubmissionInput, screenshots: File[] = []) {
    const parsed = workshopSubmissionInputSchema.parse(input);
    workshopScreenshotsSchema.parse(screenshots);
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, typeof value === "string" ? value : String(value)));
    data.set("widgetSchema", parsed.type === "customCss" ? WORKSHOP_CSS_SCHEMA : CUSTOM_WIDGET_SCHEMA);
    data.set("author", this.currentUser?.id ?? "");
    data.set("revision", "1");
    screenshots.forEach((file) => data.append("screenshots", file));
    try {
      const result = await this.pocketBase.collection("submissions").create(data);
      return this.get(result.id);
    } catch (error) {
      throw workshopError(error, "Failed to publish submission");
    }
  }

  public async update(id: string, input: WorkshopSubmissionInput, screenshots: File[] = []) {
    const parsed = workshopSubmissionInputSchema.parse(input);
    workshopScreenshotsSchema.parse(screenshots);
    const current = await this.get(id);
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, typeof value === "string" ? value : String(value)));
    data.set("widgetSchema", parsed.type === "customCss" ? WORKSHOP_CSS_SCHEMA : CUSTOM_WIDGET_SCHEMA);
    data.set("revision", String(current.revision + 1));
    screenshots.forEach((file) => data.append("screenshots", file));
    try {
      await this.pocketBase.collection("submissions").update(id, data);
      return this.get(id);
    } catch (error) {
      throw workshopError(error, "Failed to update submission");
    }
  }

  public async delete(id: string) {
    try {
      await this.pocketBase.collection("submissions").delete(id);
    } catch (error) {
      throw workshopError(error, "Failed to delete submission");
    }
  }

  public async vote(submission: string, value: 1 | -1): Promise<WorkshopVote | null> {
    const user = this.currentUser?.id ?? "";
    const filter = this.pocketBase.filter("submission = {:submission} && user = {:user}", { submission, user });
    try {
      const existing = await this.pocketBase
        .collection("votes")
        .getFirstListItem(filter)
        .catch((error: unknown) =>
          error instanceof ClientResponseError && error.status === 404 ? null : Promise.reject(error),
        );
      if (existing?.value === value) {
        await this.pocketBase.collection("votes").delete(existing.id);
        return null;
      }
      const record = existing
        ? await this.pocketBase.collection("votes").update(existing.id, { value })
        : await this.pocketBase.collection("votes").create({ submission, user, value });
      return workshopVoteSchema.parse(record);
    } catch (error) {
      throw workshopError(error, "Failed to save vote");
    }
  }

  public async report(submission: string, category: WorkshopReport["category"], explanation: string) {
    try {
      return workshopReportSchema.parse(
        await this.pocketBase.collection("reports").create({
          submission,
          reporter: this.currentUser?.id ?? "",
          category,
          explanation: explanation.trim(),
          status: "open",
        }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to report submission");
    }
  }

  public async listReports(): Promise<WorkshopReport[]> {
    try {
      const items = await this.pocketBase
        .collection("reports")
        .getFullList({ batch: 200, filter: "status = 'open'", sort: "-created", expand: "reporter,submission" });
      return items.map((item) =>
        workshopReportSchema.parse({
          ...item,
          reporterName: item.expand?.reporter?.displayName,
          submissionTitle: item.expand?.submission?.title,
        }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to load reports");
    }
  }

  public async dismissReport(id: string) {
    try {
      await this.pocketBase.collection("reports").update(id, { status: "dismissed" });
    } catch (error) {
      throw workshopError(error, "Failed to dismiss report");
    }
  }

  public async toggleOutdated(id: string, outdated: boolean) {
    try {
      await this.pocketBase.collection("submissions").update(id, { outdated });
      return this.get(id);
    } catch (error) {
      throw workshopError(error, "Failed to update submission status");
    }
  }

  public async listComments(submission: string): Promise<WorkshopComment[]> {
    try {
      const rows = await this.pocketBase.collection("comments").getFullList({
        filter: this.pocketBase.filter("submission = {:submission}", { submission }),
        sort: "-created",
        expand: "author",
      });
      return rows.map((row) =>
        workshopCommentSchema.parse({
          ...row,
          authorName: row.expand?.author?.displayName,
          authorAvatarUrl: row.expand?.author?.avatarUrl,
          authorGithubProfileUrl: row.expand?.author?.githubProfileUrl,
        }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to load comments");
    }
  }

  public async createComment(submission: string, content: string): Promise<WorkshopComment> {
    try {
      const row = await this.pocketBase
        .collection("comments")
        .create({ submission, author: this.currentUser?.id ?? "", content: content.trim() }, { expand: "author" });
      return workshopCommentSchema.parse({
        ...row,
        authorName: row.expand?.author?.displayName,
        authorAvatarUrl: row.expand?.author?.avatarUrl,
        authorGithubProfileUrl: row.expand?.author?.githubProfileUrl,
      });
    } catch (error) {
      throw workshopError(error, "Failed to post comment");
    }
  }

  public async updateComment(id: string, content: string): Promise<WorkshopComment> {
    try {
      const row = await this.pocketBase
        .collection("comments")
        .update(id, { content: content.trim() }, { expand: "author" });
      return workshopCommentSchema.parse({
        ...row,
        authorName: row.expand?.author?.displayName,
        authorAvatarUrl: row.expand?.author?.avatarUrl,
        authorGithubProfileUrl: row.expand?.author?.githubProfileUrl,
      });
    } catch (error) {
      throw workshopError(error, "Failed to update comment");
    }
  }

  public async deleteComment(id: string) {
    try {
      await this.pocketBase.collection("comments").delete(id);
    } catch (error) {
      throw workshopError(error, "Failed to delete comment");
    }
  }
}
