import PocketBase, { ClientResponseError } from "pocketbase";
import type { RecordService } from "pocketbase";
import {
  keepPreviousData,
  mutationOptions,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

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

interface WorkshopBaseRecord {
  id: string;
  collectionId: string;
  collectionName: string;
}

export interface WorkshopUserRecord extends WorkshopBaseRecord {
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  username: string;
  displayName: string;
  avatarUrl: string;
  avatar: string;
  githubUsername: string;
  githubProfileUrl: string;
  isAdmin: boolean;
  created: string;
  updated: string;
}

export interface WorkshopSubmissionRecord extends WorkshopBaseRecord {
  type: WorkshopSubmissionType;
  title: string;
  description: string;
  widgetSchema: string;
  content: string;
  revision: number;
  changelog: string;
  outdated: boolean;
  screenshots: string[];
  author: string;
  created: string;
  updated: string;
  expand?: { author?: WorkshopUserRecord };
}

export interface WorkshopListingRecord extends Omit<WorkshopSubmissionRecord, "content" | "screenshots"> {
  screenshots: string[] | string;
  authorName: string;
  authorAvatarUrl: string;
  authorGithubUsername: string;
  authorGithubProfileUrl: string;
  score: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  reportCount: number;
}

export interface WorkshopVoteRecord extends WorkshopBaseRecord {
  submission: string;
  user: string;
  value: 1 | -1;
  created: string;
  updated: string;
}

export interface WorkshopReportRecord extends WorkshopBaseRecord {
  submission: string;
  reporter: string;
  category: WorkshopReport["category"];
  explanation: string;
  status: WorkshopReport["status"];
  created: string;
  updated: string;
  expand?: { reporter?: WorkshopUserRecord; submission?: WorkshopSubmissionRecord };
}

export interface WorkshopCommentRecord extends WorkshopBaseRecord {
  submission: string;
  author: string;
  content: string;
  created: string;
  updated: string;
  expand?: { author?: WorkshopUserRecord };
}

export interface TypedWorkshopPocketBase extends PocketBase {
  collection(idOrName: "users"): RecordService<WorkshopUserRecord>;
  collection(idOrName: "submissions"): RecordService<WorkshopSubmissionRecord>;
  collection(idOrName: "workshop_listings"): RecordService<WorkshopListingRecord>;
  collection(idOrName: "votes"): RecordService<WorkshopVoteRecord>;
  collection(idOrName: "reports"): RecordService<WorkshopReportRecord>;
  collection(idOrName: "comments"): RecordService<WorkshopCommentRecord>;
  collection(idOrName: string): RecordService;
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

function githubProfile(meta: Record<string, unknown> | undefined, record: { id: string }) {
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

const timestamp = (value: string) => (Number.isNaN(Date.parse(value)) ? 0 : Date.parse(value));

function sortListings(items: WorkshopSubmissionSummary[], sort: WorkshopListOptions["sort"]) {
  return items.toSorted((left, right) => {
    if (sort === "newest") return timestamp(right.created) - timestamp(left.created);
    if (sort === "recent") return timestamp(right.updated) - timestamp(left.updated);
    if (sort === "discussed")
      return right.commentCount - left.commentCount || timestamp(right.created) - timestamp(left.created);
    return right.score - left.score || timestamp(right.created) - timestamp(left.created);
  });
}

function filterListings(items: WorkshopSubmissionSummary[], options: WorkshopListOptions) {
  const search = options.search?.trim().toLocaleLowerCase();
  return sortListings(
    items.filter((item) => {
      if (options.type && options.type !== "all" && item.type !== options.type) return false;
      if (options.author && item.author !== options.author) return false;
      if (options.includeOutdated === false && item.outdated) return false;
      if (search && !`${item.title}\n${item.description}\n${item.authorName}`.toLocaleLowerCase().includes(search))
        return false;
      return true;
    }),
    options.sort,
  );
}

const listingSort = (sort: WorkshopListOptions["sort"]) => {
  if (sort === "newest") return "-created";
  if (sort === "recent") return "-updated";
  if (sort === "discussed") return "-commentCount,-created";
  return "-score,-created";
};

function listingFilter(pocketBase: TypedWorkshopPocketBase, options: WorkshopListOptions) {
  const filters: string[] = [];
  if (options.type && options.type !== "all") filters.push(pocketBase.filter("type = {:type}", { type: options.type }));
  if (options.search?.trim()) {
    filters.push(
      pocketBase.filter("(title ~ {:search} || description ~ {:search} || authorName ~ {:search})", {
        search: options.search.trim(),
      }),
    );
  }
  if (options.author) filters.push(pocketBase.filter("author = {:author}", { author: options.author }));
  if (options.includeOutdated === false) filters.push("outdated = false");
  return filters.join(" && ");
}

const isViewCompatibilityError = (error: unknown) =>
  error instanceof ClientResponseError && (error.status === 400 || error.status === 404);

const enrichAuthor = (row: unknown) => {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return row;
  const record = row as Record<string, unknown>;
  const expand = record.expand;
  const author =
    typeof expand === "object" && expand !== null && !Array.isArray(expand)
      ? (expand as Record<string, unknown>).author
      : undefined;
  const user =
    typeof author === "object" && author !== null && !Array.isArray(author) ? (author as Record<string, unknown>) : {};
  const githubUsername = record.authorGithubUsername || user.githubUsername || user.username;
  return {
    ...record,
    authorName: record.authorName || user.displayName || user.username,
    authorAvatarUrl: record.authorAvatarUrl || user.avatarUrl,
    authorGithubUsername: githubUsername,
    authorGithubProfileUrl:
      record.authorGithubProfileUrl ||
      user.githubProfileUrl ||
      (typeof githubUsername === "string" && githubUsername
        ? `https://github.com/${encodeURIComponent(githubUsername)}`
        : undefined),
  };
};

const parseListings = (rows: unknown[]) =>
  rows.flatMap((row) => {
    const result = workshopSubmissionSummarySchema.safeParse(enrichAuthor(row));
    return result.success ? [result.data] : [];
  });

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
    return Object.assign(new Error(message, { cause: error }), { status: error.status });
  }
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
    return new Error(`${fallback}. The request timed out.`, { cause: error });
  return error instanceof Error ? error : new Error(fallback);
}

export class WorkshopBackend {
  public readonly pocketBase: TypedWorkshopPocketBase;

  public constructor(public readonly baseUrl = WORKSHOP_API_URL) {
    this.pocketBase = new PocketBase(baseUrl.replace(/\/$/u, "")) as TypedWorkshopPocketBase;
    this.pocketBase.autoCancellation(false);
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
    try {
      const page = options.page ?? 1;
      const perPage = options.perPage ?? 24;
      try {
        const result = await this.pocketBase.collection("workshop_listings").getList(page, perPage, {
          filter: listingFilter(this.pocketBase, options),
          sort: listingSort(options.sort),
          signal: requestSignal(options.signal),
        });
        return { ...result, items: parseListings(result.items) };
      } catch (error) {
        if (!isViewCompatibilityError(error)) throw error;
        const items = filterListings(await this.loadListingsFallback(options.signal), options);
        return {
          page,
          perPage,
          totalItems: items.length,
          totalPages: Math.ceil(items.length / perPage),
          items: items.slice((page - 1) * perPage, page * perPage),
        };
      }
    } catch (error) {
      throw workshopError(error, "Failed to load Workshop submissions");
    }
  }

  public async listAll(options: Omit<WorkshopListOptions, "page" | "perPage"> = {}) {
    try {
      try {
        const rows = await this.pocketBase.collection("workshop_listings").getFullList({
          batch: 200,
          filter: listingFilter(this.pocketBase, options),
          sort: listingSort(options.sort),
          signal: requestSignal(options.signal),
        });
        return parseListings(rows);
      } catch (error) {
        if (!isViewCompatibilityError(error)) throw error;
        return filterListings(await this.loadListingsFallback(options.signal), options);
      }
    } catch (error) {
      throw workshopError(error, "Failed to load Workshop submissions");
    }
  }

  private async loadListingsFallback(signal?: AbortSignal) {
    const options = { batch: 200, signal: requestSignal(signal) };
    const rows = await this.pocketBase
      .collection("workshop_listings")
      .getFullList(options)
      .catch((error: unknown) => {
        if (isViewCompatibilityError(error))
          return this.pocketBase.collection("submissions").getFullList({ ...options, expand: "author" });
        throw error;
      });
    return parseListings(rows);
  }

  public async get(id: string, signal?: AbortSignal): Promise<WorkshopSubmissionDetail> {
    try {
      const submission = await this.pocketBase
        .collection("submissions")
        .getOne(id, { signal: requestSignal(signal), expand: "author" });
      const listing = await this.pocketBase
        .collection("workshop_listings")
        .getOne(id, { signal: requestSignal(signal) })
        .catch((error: unknown) => {
          if (error instanceof ClientResponseError && (error.status === 400 || error.status === 404)) return {};
          throw error;
        });
      return workshopSubmissionDetailSchema.parse(
        enrichAuthor({ ...submission, ...listing, expand: submission.expand, content: submission.content }),
      );
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

  public async listVotesForCurrentUser(): Promise<WorkshopVote[]> {
    const user = this.currentUser?.id;
    if (!user) return [];
    try {
      const rows = await this.pocketBase.collection("votes").getFullList({
        filter: this.pocketBase.filter("user = {:user}", { user }),
      });
      return rows.map((row) => workshopVoteSchema.parse(row));
    } catch (error) {
      throw workshopError(error, "Failed to load votes");
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
        sort: "created",
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

const listKeyOptions = (options: WorkshopListOptions) => ({
  page: options.page,
  perPage: options.perPage,
  sort: options.sort,
  search: options.search,
  author: options.author,
  type: options.type,
  includeOutdated: options.includeOutdated,
});

export const workshopQueryKeys = {
  all: ["workshop"] as const,
  lists: (baseUrl?: string) => [...workshopQueryKeys.all, "list", baseUrl] as const,
  list: (backend: WorkshopBackend, options: WorkshopListOptions) =>
    [...workshopQueryKeys.lists(backend.baseUrl), listKeyOptions(options)] as const,
  details: (baseUrl?: string) => [...workshopQueryKeys.all, "detail", baseUrl] as const,
  detail: (backend: WorkshopBackend, id: string) => [...workshopQueryKeys.details(backend.baseUrl), id] as const,
  reports: (backend: WorkshopBackend) => [...workshopQueryKeys.all, "reports", backend.baseUrl] as const,
  comments: (backend: WorkshopBackend, submission: string) =>
    [...workshopQueryKeys.all, "comments", backend.baseUrl, submission] as const,
};

export const workshopListQueryOptions = (backend: WorkshopBackend, options: WorkshopListOptions = {}) =>
  queryOptions({
    queryKey: workshopQueryKeys.list(backend, options),
    queryFn: ({ signal }) => backend.list({ ...options, signal }),
    placeholderData: keepPreviousData,
  });

export const workshopSubmissionQueryOptions = (backend: WorkshopBackend, id: string) =>
  queryOptions({
    queryKey: workshopQueryKeys.detail(backend, id),
    queryFn: ({ signal }) => backend.get(id, signal),
    enabled: id.length > 0,
  });

export const workshopReportsQueryOptions = (backend: WorkshopBackend) =>
  queryOptions({ queryKey: workshopQueryKeys.reports(backend), queryFn: () => backend.listReports() });

export const workshopCommentsQueryOptions = (backend: WorkshopBackend, submission: string) =>
  queryOptions({
    queryKey: workshopQueryKeys.comments(backend, submission),
    queryFn: () => backend.listComments(submission),
    enabled: submission.length > 0,
  });

export const workshopCreateMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ input, screenshots = [] }: { input: WorkshopSubmissionInput; screenshots?: File[] }) =>
      backend.create(input, screenshots),
  });

export const workshopUpdateMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({
      id,
      input,
      screenshots = [],
    }: {
      id: string;
      input: WorkshopSubmissionInput;
      screenshots?: File[];
    }) => backend.update(id, input, screenshots),
  });

export const workshopDeleteMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({ mutationFn: (id: string) => backend.delete(id) });

export const workshopVoteMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ submission, value }: { submission: string; value: 1 | -1 }) => backend.vote(submission, value),
  });

export const workshopReportMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({
      submission,
      category,
      explanation,
    }: Pick<WorkshopReport, "submission" | "category" | "explanation">) =>
      backend.report(submission, category, explanation),
  });

export const workshopDismissReportMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({ mutationFn: (id: string) => backend.dismissReport(id) });

export const workshopToggleOutdatedMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ id, outdated }: { id: string; outdated: boolean }) => backend.toggleOutdated(id, outdated),
  });

export const workshopCreateCommentMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ submission, content }: { submission: string; content: string }) =>
      backend.createComment(submission, content),
  });

export const workshopUpdateCommentMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ id, content }: { id: string; content: string }) => backend.updateComment(id, content),
  });

export const workshopDeleteCommentMutationOptions = (backend: WorkshopBackend) =>
  mutationOptions({
    mutationFn: ({ id }: { id: string; submission: string }) => backend.deleteComment(id),
  });

export function useWorkshopQuery(backend: WorkshopBackend, options: WorkshopListOptions = {}) {
  return useQuery(workshopListQueryOptions(backend, options));
}

export function useWorkshopSubmissionQuery(backend: WorkshopBackend, id: string) {
  return useQuery(workshopSubmissionQueryOptions(backend, id));
}

export function useWorkshopReportsQuery(backend: WorkshopBackend) {
  return useQuery(workshopReportsQueryOptions(backend));
}

export function useWorkshopCommentsQuery(backend: WorkshopBackend, submission: string) {
  return useQuery(workshopCommentsQueryOptions(backend, submission));
}

function useWorkshopInvalidation(backend: WorkshopBackend) {
  const queryClient = useQueryClient();
  return {
    lists: () => queryClient.invalidateQueries({ queryKey: workshopQueryKeys.lists(backend.baseUrl) }),
    details: () => queryClient.invalidateQueries({ queryKey: workshopQueryKeys.details(backend.baseUrl) }),
    detail: (id: string) => queryClient.invalidateQueries({ queryKey: workshopQueryKeys.detail(backend, id) }),
    removeDetail: (id: string) => queryClient.removeQueries({ queryKey: workshopQueryKeys.detail(backend, id) }),
    reports: () => queryClient.invalidateQueries({ queryKey: workshopQueryKeys.reports(backend) }),
    comments: (submission: string) =>
      queryClient.invalidateQueries({ queryKey: workshopQueryKeys.comments(backend, submission) }),
  };
}

export function useWorkshopCreateMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({ ...workshopCreateMutationOptions(backend), onSuccess: invalidation.lists });
}

export function useWorkshopUpdateMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopUpdateMutationOptions(backend),
    onSuccess: async (submission) => Promise.all([invalidation.lists(), invalidation.detail(submission.id)]),
  });
}

export function useWorkshopDeleteMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopDeleteMutationOptions(backend),
    onSuccess: async (_result, id) => {
      invalidation.removeDetail(id);
      await invalidation.lists();
    },
  });
}

export function useWorkshopVoteMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopVoteMutationOptions(backend),
    onSuccess: async () => Promise.all([invalidation.lists(), invalidation.details()]),
  });
}

export function useWorkshopReportMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopReportMutationOptions(backend),
    onSuccess: async () => Promise.all([invalidation.lists(), invalidation.details(), invalidation.reports()]),
  });
}

export function useWorkshopDismissReportMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopDismissReportMutationOptions(backend),
    onSuccess: async () => Promise.all([invalidation.reports(), invalidation.lists(), invalidation.details()]),
  });
}

export function useWorkshopToggleOutdatedMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopToggleOutdatedMutationOptions(backend),
    onSuccess: async (submission) => Promise.all([invalidation.lists(), invalidation.detail(submission.id)]),
  });
}

export function useWorkshopCreateCommentMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopCreateCommentMutationOptions(backend),
    onSuccess: async (_comment, input) =>
      Promise.all([invalidation.comments(input.submission), invalidation.lists(), invalidation.details()]),
  });
}

export function useWorkshopUpdateCommentMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopUpdateCommentMutationOptions(backend),
    onSuccess: (comment) => invalidation.comments(comment.submission),
  });
}

export function useWorkshopDeleteCommentMutation(backend: WorkshopBackend) {
  const invalidation = useWorkshopInvalidation(backend);
  return useMutation({
    ...workshopDeleteCommentMutationOptions(backend),
    onSuccess: async (_result, input) =>
      Promise.all([invalidation.comments(input.submission), invalidation.lists(), invalidation.details()]),
  });
}

export function useWorkshopWidgetImportMutation(
  install: ((widget: HomarrCustomWidgetV2) => Promise<void>) | undefined,
  onSuccess?: () => void,
) {
  return useMutation({ mutationFn: async (widget: HomarrCustomWidgetV2) => install?.(widget), onSuccess });
}

export function useWorkshopCssImportMutation(useCss: ((css: string) => void) | undefined, onSuccess?: () => void) {
  return useMutation({ mutationFn: async (css: string) => useCss?.(css), onSuccess });
}
