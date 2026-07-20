import PocketBase, { ClientResponseError } from "pocketbase";

import type {
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
  workshopReportSchema,
  workshopSubmissionDetailSchema,
  workshopSubmissionSummarySchema,
  workshopSubmissionInputSchema,
  workshopScreenshotsSchema,
  workshopUserSchema,
  workshopVoteSchema,
} from "./schema";

const WORKSHOP_OAUTH_TIMEOUT_MS = 2 * 60_000;

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

function firstNonEmptyString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
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
      return this.currentUser;
    } catch {
      this.pocketBase.authStore.clear();
      return null;
    }
  }

  public async signInWithGitHub() {
    if (typeof window === "undefined" || typeof window.open !== "function") {
      throw new WorkshopError("unavailable", "GitHub sign-in requires a browser popup");
    }

    const popup = window.open(
      "about:blank",
      "homarr_workshop_oauth",
      "width=1024,height=768,resizable=yes,scrollbars=yes,menubar=no",
    );
    if (!popup) throw new WorkshopError("unavailable", "GitHub sign-in popup was blocked by the browser");

    const requestKey = `workshop_oauth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let closePoll: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const popupFailure = new Promise<never>((_resolve, reject) => {
      closePoll = setInterval(() => {
        if (popup.closed) reject(new WorkshopError("unknown", "GitHub sign-in was cancelled"));
      }, 250);
      timeout = setTimeout(
        () => reject(new WorkshopError("unavailable", "GitHub sign-in timed out")),
        WORKSHOP_OAUTH_TIMEOUT_MS,
      );
    });

    try {
      const auth = await Promise.race([
        this.pocketBase.collection("users").authWithOAuth2({
          provider: "github",
          createData: { displayName: "Community member" },
          requestKey,
          urlCallback: (url) => {
            if (popup.closed) throw new WorkshopError("unknown", "GitHub sign-in was cancelled");
            popup.location.href = url;
          },
        }),
        popupFailure,
      ]);
      const rawUser =
        auth.meta?.rawUser && typeof auth.meta.rawUser === "object"
          ? (auth.meta.rawUser as Record<string, unknown>)
          : undefined;
      const displayName = firstNonEmptyString(
        auth.meta?.name,
        auth.meta?.username,
        rawUser?.name,
        rawUser?.login,
        auth.record.name,
        auth.record.username,
      );
      const avatarUrl = firstNonEmptyString(
        auth.meta?.avatarUrl,
        auth.meta?.avatar,
        rawUser?.avatar_url,
        auth.record.avatarUrl,
        auth.record.avatar,
      );
      if (displayName || avatarUrl) {
        await this.pocketBase.collection("users").update(auth.record.id, {
          ...(displayName ? { displayName } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        });
      }
      return this.refreshAuth();
    } catch (error) {
      throw workshopError(error, "GitHub sign-in failed");
    } finally {
      if (closePoll) clearInterval(closePoll);
      if (timeout) clearTimeout(timeout);
      this.pocketBase.cancelRequest(requestKey);
      if (!popup.closed) popup.close();
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
    const data = new FormData();
    Object.entries(parsed).forEach(([key, value]) => data.set(key, value));
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
        await this.pocketBase
          .collection("reports")
          .create({ submission, reporter: this.currentUser?.id ?? "", category, explanation: explanation.trim() }),
      );
    } catch (error) {
      throw workshopError(error, "Failed to report submission");
    }
  }

  public async listReports(): Promise<WorkshopReport[]> {
    try {
      const items = await this.pocketBase
        .collection("reports")
        .getFullList({ batch: 200, sort: "-created", expand: "reporter,submission" });
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
      await this.pocketBase.collection("reports").delete(id);
    } catch (error) {
      throw workshopError(error, "Failed to dismiss report");
    }
  }
}
