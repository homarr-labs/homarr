import PocketBase, { ClientResponseError } from "pocketbase";

import type {
  WorkshopAccountState,
  WorkshopModerationAction,
  WorkshopReport,
  WorkshopRole,
  WorkshopSubmissionDetail,
  WorkshopSubmissionInput,
  WorkshopSubmissionSummary,
  WorkshopSubmissionType,
  WorkshopUser,
  WorkshopVote,
} from "./schema";

import {
  WORKSHOP_API_URL,
  WorkshopError,
  schemaVersionForType,
  workshopAccountStateSchema,
  workshopErrorCodeSchema,
  workshopModerationActionSchema,
  workshopReportSchema,
  workshopRoleSchema,
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
  type?: WorkshopSubmissionType | "all";
  sort?: "top" | "newest";
  search?: string;
  author?: string;
}

export interface WorkshopPage<T> {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

const errorCodeForStatus = (status: number) => {
  if (status === 401) return "authentication_required" as const;
  if (status === 403) return "forbidden" as const;
  if (status === 404) return "not_found" as const;
  if (status === 409) return "conflict" as const;
  if (status === 429) return "rate_limited" as const;
  if (status >= 500) return "unavailable" as const;
  return "unknown" as const;
};

const asWorkshopError = (error: unknown, fallback: string) => {
  if (error instanceof WorkshopError) return error;
  if (error instanceof ClientResponseError) {
    const message = error.data?.message || error.message || fallback;
    const messageCode =
      message === "Account is disabled"
        ? "account_disabled"
        : message === "Account cannot publish submissions"
          ? "posting_banned"
          : undefined;
    const parsedCode = workshopErrorCodeSchema.safeParse(messageCode ?? error.data?.data?.code ?? error.data?.code);
    const code = parsedCode.success ? parsedCode.data : errorCodeForStatus(error.status);
    return new WorkshopError(code, message, error.status);
  }
  return new WorkshopError("unknown", error instanceof Error ? error.message : fallback);
};

export class WorkshopClient {
  readonly pocketBase: PocketBase;

  constructor(readonly baseUrl = WORKSHOP_API_URL) {
    this.pocketBase = new PocketBase(baseUrl.replace(/\/$/, ""));
  }

  get currentUser(): WorkshopUser | null {
    const record = this.pocketBase.authStore.record;
    if (!record) return null;
    return workshopUserSchema.parse({
      id: record.id,
      displayName: record.displayName || record.name || record.username || "Community member",
      avatarUrl: record.avatarUrl || record.avatar || "",
      role: workshopRoleSchema.catch("member").parse(record.role),
      state: workshopAccountStateSchema.catch("active").parse(record.state),
    });
  }

  subscribeToAuth(listener: (user: WorkshopUser | null) => void) {
    return this.pocketBase.authStore.onChange(() => listener(this.currentUser), true);
  }

  async refreshAuth() {
    if (!this.pocketBase.authStore.isValid) return null;
    try {
      await this.pocketBase.collection("users").authRefresh();
      return this.currentUser;
    } catch {
      this.pocketBase.authStore.clear();
      return null;
    }
  }

  async signInWithGitHub() {
    try {
      await this.pocketBase.collection("users").authWithOAuth2({ provider: "github" });
      return this.currentUser;
    } catch (error) {
      throw asWorkshopError(error, "GitHub sign-in failed");
    }
  }

  signOut() {
    this.pocketBase.authStore.clear();
  }

  async list(options: WorkshopListOptions = {}): Promise<WorkshopPage<WorkshopSubmissionSummary>> {
    const filters: string[] = [];
    if (options.type && options.type !== "all")
      filters.push(this.pocketBase.filter("type = {:type}", { type: options.type }));
    if (options.search?.trim())
      filters.push(this.pocketBase.filter("title ~ {:search}", { search: options.search.trim() }));
    if (options.author) filters.push(this.pocketBase.filter("author = {:author}", { author: options.author }));
    try {
      const result = await this.pocketBase
        .collection("workshop_listings")
        .getList(options.page ?? 1, options.perPage ?? 24, {
          filter: filters.join(" && "),
          sort: options.sort === "newest" ? "-created" : "-score,-created",
        });
      return { ...result, items: result.items.map((item) => workshopSubmissionSummarySchema.parse(item)) };
    } catch (error) {
      throw asWorkshopError(error, "Failed to load Workshop submissions");
    }
  }

  async get(id: string): Promise<WorkshopSubmissionDetail> {
    try {
      return workshopSubmissionDetailSchema.parse(await this.pocketBase.collection("submissions").getOne(id));
    } catch (error) {
      throw asWorkshopError(error, "Submission not found");
    }
  }

  fileUrl(submissionId: string, filename: string, thumb?: string) {
    const query = thumb ? `?thumb=${encodeURIComponent(thumb)}` : "";
    return `${this.baseUrl}/api/files/submissions/${submissionId}/${encodeURIComponent(filename)}${query}`;
  }

  async create(input: WorkshopSubmissionInput, screenshots: File[] = []) {
    const parsed = workshopSubmissionInputSchema.parse(input);
    workshopScreenshotsSchema.parse(screenshots);
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, value));
    data.set("schemaVersion", schemaVersionForType(parsed.type));
    screenshots.forEach((file) => data.append("screenshots", file));
    try {
      const result = await this.pocketBase.collection("submissions").create(data);
      return this.get(result.id);
    } catch (error) {
      throw asWorkshopError(error, "Failed to publish submission");
    }
  }

  async update(
    id: string,
    input: WorkshopSubmissionInput,
    screenshots: File[] = [],
    removedScreenshots: string[] = [],
  ) {
    const parsed = workshopSubmissionInputSchema.parse(input);
    workshopScreenshotsSchema.parse(screenshots);
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, value));
    screenshots.forEach((file) => data.append("screenshots+", file));
    removedScreenshots.forEach((filename) => data.append("screenshots-", filename));
    try {
      await this.pocketBase.collection("submissions").update(id, data);
      return this.get(id);
    } catch (error) {
      throw asWorkshopError(error, "Failed to update submission");
    }
  }

  async delete(id: string) {
    try {
      await this.pocketBase.collection("submissions").delete(id);
    } catch (error) {
      throw asWorkshopError(error, "Failed to delete submission");
    }
  }

  async vote(submissionId: string, value: 1 | -1): Promise<WorkshopVote | null> {
    const filter = this.pocketBase.filter("submission = {:submission} && user = {:user}", {
      submission: submissionId,
      user: this.currentUser?.id ?? "",
    });
    try {
      const existing = await this.pocketBase
        .collection("votes")
        .getFirstListItem(filter)
        .catch((error: unknown) => {
          if (error instanceof ClientResponseError && error.status === 404) return null;
          throw error;
        });
      if (existing?.value === value) {
        await this.pocketBase.collection("votes").delete(existing.id);
        return null;
      }
      const record = existing
        ? await this.pocketBase.collection("votes").update(existing.id, { value })
        : await this.pocketBase.collection("votes").create({ submission: submissionId, value });
      return workshopVoteSchema.parse(record);
    } catch (error) {
      throw asWorkshopError(error, "Failed to save vote");
    }
  }

  async report(submission: string, category: WorkshopReport["category"], explanation: string) {
    try {
      return workshopReportSchema.parse(
        await this.pocketBase.collection("reports").create({ submission, category, explanation }),
      );
    } catch (error) {
      throw asWorkshopError(error, "Failed to submit report");
    }
  }

  async moderate(path: string, body: Record<string, unknown>) {
    try {
      return await this.pocketBase.send(`/api/workshop/moderation/${path}`, { method: "POST", body });
    } catch (error) {
      throw asWorkshopError(error, "Moderation action failed");
    }
  }

  removeSubmission(id: string, reason: string) {
    return this.moderate(`submissions/${id}/remove`, { reason });
  }

  updateAccountState(id: string, state: WorkshopAccountState, reason: string) {
    return this.moderate(`users/${id}/state`, { state, reason });
  }

  updateRole(id: string, role: WorkshopRole, reason: string) {
    return this.moderate(`users/${id}/role`, { role, reason });
  }

  resolveReport(id: string, status: "resolved" | "dismissed", reason: string) {
    return this.moderate(`reports/${id}/resolve`, { status, reason });
  }

  async listReports(status: "open" | "resolved" | "dismissed" = "open") {
    try {
      const result = await this.pocketBase.collection("reports").getList(1, 100, {
        filter: this.pocketBase.filter("status = {:status}", { status }),
        sort: "-created",
      });
      return result.items.map((item) => workshopReportSchema.parse(item));
    } catch (error) {
      throw asWorkshopError(error, "Failed to load reports");
    }
  }

  async listUsers() {
    try {
      const result = await this.pocketBase.collection("users").getList(1, 200, { sort: "displayName" });
      return result.items.map((item) => workshopUserSchema.parse(item));
    } catch (error) {
      throw asWorkshopError(error, "Failed to load users");
    }
  }

  async listModerationActions(): Promise<WorkshopModerationAction[]> {
    try {
      const result = await this.pocketBase.collection("moderation_actions").getList(1, 100, { sort: "-created" });
      return result.items.map((item) => workshopModerationActionSchema.parse(item));
    } catch (error) {
      throw asWorkshopError(error, "Failed to load moderation history");
    }
  }
}
