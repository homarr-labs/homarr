import PocketBase, { ClientResponseError } from "pocketbase";

import type {
  WorkshopAdminAction,
  WorkshopReport,
  WorkshopSubmissionDetail,
  WorkshopSubmissionInput,
  WorkshopSubmissionSummary,
  WorkshopUser,
  WorkshopVote,
} from "./schema";
import {
  WORKSHOP_API_URL,
  WORKSHOP_REQUEST_TIMEOUT_MS,
  WorkshopError,
  workshopAdminActionSchema,
  workshopReportSchema,
  workshopSubmissionDetailSchema,
  workshopSubmissionInputSchema,
  workshopSubmissionSummarySchema,
  workshopScreenshotsSchema,
  workshopUserSchema,
  workshopVoteSchema,
} from "./schema";

export interface WorkshopListOptions {
  page?: number;
  perPage?: number;
  sort?: "top" | "newest";
  search?: string;
  author?: string;
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

function workshopError(error: unknown, fallback: string) {
  if (error instanceof WorkshopError) return error;
  if (error instanceof ClientResponseError) {
    const code =
      error.status === 401
        ? "authentication_required"
        : error.status === 403
          ? "forbidden"
          : error.status === 404
            ? "not_found"
            : error.status === 409
              ? "conflict"
              : error.status === 429
                ? "rate_limited"
                : error.status >= 500
                  ? "unavailable"
                  : "unknown";
    return new WorkshopError(code, error.data?.message || error.message || fallback, error.status);
  }
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
    return new WorkshopError("unavailable", `${fallback}. The request timed out.`);
  return new WorkshopError("unknown", error instanceof Error ? error.message : fallback);
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
      avatarUrl: record.avatarUrl || record.avatar || "",
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
      const user = this.currentUser;
      if (!user) return null;
      const admin = await this.pocketBase
        .collection("workshop_admins")
        .getFirstListItem(this.pocketBase.filter("user = {:user}", { user: user.id }))
        .catch(() => null);
      return { ...user, isAdmin: admin !== null };
    } catch {
      this.pocketBase.authStore.clear();
      return null;
    }
  }

  public async signInWithGitHub() {
    try {
      await this.pocketBase
        .collection("users")
        .authWithOAuth2({ provider: "github", createData: { displayName: "Community member" } });
      return this.refreshAuth();
    } catch (error) {
      throw workshopError(error, "GitHub sign-in failed");
    }
  }

  public signOut() {
    this.pocketBase.authStore.clear();
  }

  public async list(options: WorkshopListOptions = {}): Promise<WorkshopPage<WorkshopSubmissionSummary>> {
    const filters: string[] = [];
    if (options.search?.trim())
      filters.push(this.pocketBase.filter("title ~ {:search}", { search: options.search.trim() }));
    if (options.author) filters.push(this.pocketBase.filter("author = {:author}", { author: options.author }));
    try {
      const result = await this.pocketBase
        .collection("workshop_listings")
        .getList(options.page ?? 1, options.perPage ?? 24, {
          filter: filters.join(" && "),
          sort: options.sort === "newest" ? "-created" : "-score,-created",
          signal: requestSignal(options.signal),
        });
      return { ...result, items: result.items.map((item) => workshopSubmissionSummarySchema.parse(item)) };
    } catch (error) {
      throw workshopError(error, "Failed to load Workshop submissions");
    }
  }

  public async listAll(options: Omit<WorkshopListOptions, "page" | "perPage"> = {}) {
    const filters: string[] = [];
    if (options.search?.trim())
      filters.push(this.pocketBase.filter("title ~ {:search}", { search: options.search.trim() }));
    if (options.author) filters.push(this.pocketBase.filter("author = {:author}", { author: options.author }));
    try {
      const items = await this.pocketBase.collection("workshop_listings").getFullList({
        batch: 200,
        filter: filters.join(" && "),
        sort: options.sort === "top" ? "-score,-created" : "-created",
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
    Object.entries(parsed).forEach(([key, value]) => data.set(key, value));
    data.set("author", this.currentUser?.id ?? "");
    data.set("authorName", this.currentUser?.displayName ?? "Community member");
    screenshots.forEach((file) => data.append("screenshots", file));
    try {
      const result = await this.pocketBase.collection("submissions").create(data);
      return this.get(result.id);
    } catch (error) {
      throw workshopError(error, "Failed to publish submission");
    }
  }

  public async update(id: string, input: WorkshopSubmissionInput, screenshots: File[] = [], removed: string[] = []) {
    const parsed = workshopSubmissionInputSchema.parse(input);
    workshopScreenshotsSchema.parse(screenshots);
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, value));
    screenshots.forEach((file) => data.append("screenshots+", file));
    removed.forEach((file) => data.append("screenshots-", file));
    try {
      await this.pocketBase.collection("submissions").update(id, data);
      return this.get(id);
    } catch (error) {
      throw workshopError(error, "Failed to update submission");
    }
  }

  public async delete(id: string, reason = "Deleted by author") {
    try {
      await this.pocketBase.collection("submissions").delete(id, { headers: { "x-workshop-reason": reason } });
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
        await this.pocketBase
          .collection("reports")
          .create({ submission, reporter: this.currentUser?.id ?? "", category, explanation, status: "open" }),
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

  public async dismissReport(id: string, reason: string) {
    try {
      return workshopReportSchema.parse(
        await this.pocketBase.collection("reports").update(id, { status: "dismissed", dismissalReason: reason }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to dismiss report");
    }
  }

  public async listAdminActions(): Promise<WorkshopAdminAction[]> {
    try {
      const items = await this.pocketBase
        .collection("workshop_admin_actions")
        .getFullList({ batch: 200, sort: "-created", expand: "actor" });
      return items.map((item) =>
        workshopAdminActionSchema.parse({ ...item, actorName: item.expand?.actor?.displayName }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to load administrator history");
    }
  }
}
