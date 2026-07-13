import React, { useEffect, useMemo, useState } from "react";
import Link from "@docusaurus/Link";
import { useHistory, useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconCopy,
  IconDownload,
  IconFlag,
  IconHeart,
  IconPackage,
  IconSearch,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";

import {
  MAX_CONTENT_LENGTH,
  MAX_SCREENSHOTS,
  WorkshopClient,
  type WorkshopSubmissionDetail,
  type WorkshopSubmissionInput,
  type WorkshopSubmissionSummary,
  type WorkshopSubmissionType,
  type WorkshopUser,
  workshopExportFilename,
} from "@homarr/workshop";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { WorkshopQueryProvider } from "./WorkshopQueryProvider";
import { WorkshopDialog, WorkshopServiceState } from "./WorkshopUi";
import styles from "./workshop.module.css";

const useWorkshop = () => {
  const { siteConfig } = useDocusaurusContext();
  const apiUrl = (siteConfig.customFields?.workshopApiUrl as string | undefined) || window.location.origin;
  return useMemo(() => new WorkshopClient(apiUrl), [apiUrl]);
};

const saveContent = (submission: WorkshopSubmissionDetail) => {
  const url = URL.createObjectURL(
    new Blob([submission.content], { type: submission.type === "css" ? "text/css" : "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = workshopExportFilename(submission.title, submission.type);
  link.click();
  URL.revokeObjectURL(url);
};

export function WorkshopApp() {
  return (
    <WorkshopQueryProvider>
      <WorkshopAppContent />
    </WorkshopQueryProvider>
  );
}

function WorkshopAppContent() {
  const client = useWorkshop();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<WorkshopSubmissionType | "all">("all");
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const signInMutation = useMutation({
    mutationKey: ["workshop", "auth", "sign-in"],
    mutationFn: () => client.signInWithGitHub(),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["workshop"] }),
    onError: (caught) => setError(caught instanceof Error ? caught.message : "Sign-in failed"),
  });

  useEffect(() => client.subscribeToAuth(setUser), [client]);
  useEffect(() => {
    void client.refreshAuth().catch(() => undefined);
  }, [client]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const listQuery = useQuery({
    queryKey: ["workshop", "list", page, type, sort, debouncedSearch, mine ? user?.id : null],
    queryFn: ({ signal }) =>
      client.list({
        page,
        type,
        sort,
        search: debouncedSearch,
        author: mine ? user?.id : undefined,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Made by the Homarr community</span>
          <h1>Workshop</h1>
          <p>Discover useful creations, inspect every line, then bring the ones you trust into Homarr.</p>
          <ul className={styles.heroPromises} aria-label="Workshop principles">
            <li>
              <IconSparkles size={16} /> Community-made
            </li>
            <li>
              <IconPackage size={16} /> Ready to export
            </li>
            <li>
              <IconHeart size={16} /> Ranked by members
            </li>
          </ul>
        </div>
        <div className={styles.accountActions}>
          {user ? (
            <>
              {(user.role === "moderator" || user.role === "admin") && (
                <Link className="button button--secondary" to="/workshop/admin">
                  Moderate
                </Link>
              )}
              <button className="button button--primary" onClick={() => setShowForm(true)}>
                <IconUpload size={17} /> Share creation
              </button>
              <button className="button button--secondary" onClick={() => client.signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <button
              className="button button--primary"
              disabled={signInMutation.isPending}
              onClick={() => signInMutation.mutate()}
            >
              <IconBrandGithub size={18} /> {signInMutation.isPending ? "Connecting…" : "Sign in with GitHub"}
            </button>
          )}
        </div>
      </header>

      <section className={styles.safety} aria-label="Community content warning">
        <IconAlertTriangle aria-hidden size={20} />
        <p>
          Workshop content is community-provided. Inspect source before installing it and keep a current Homarr backup.
        </p>
      </section>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className="sr-only">Search Workshop</span>
          <IconSearch aria-hidden size={18} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search creations"
          />
        </label>
        <label>
          Type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as typeof type);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="widget">Widgets</option>
            <option value="css">CSS themes</option>
          </select>
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as typeof sort);
              setPage(1);
            }}
          >
            <option value="top">Top rated</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        {user && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => {
                setMine(event.target.checked);
                setPage(1);
              }}
            />{" "}
            My submissions
          </label>
        )}
      </div>

      {(error || listQuery.isError || listQuery.fetchStatus === "paused") && (
        <WorkshopServiceState
          cached={items.length > 0}
          message={error || undefined}
          onRetry={() => void listQuery.refetch()}
        />
      )}
      {listQuery.isPending ? (
        <WorkshopSkeleton />
      ) : items.length ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <WorkshopCard client={client} item={item} key={item.id} />
          ))}
        </div>
      ) : listQuery.isError || listQuery.fetchStatus === "paused" ? null : (
        <section className={styles.empty}>
          <IconSearch size={32} aria-hidden />
          <h2>No creations found</h2>
          <p>Try a broader search or clear the filters to explore everything the community has shared.</p>
          <button
            className="button button--secondary button--sm"
            onClick={() => {
              setSearch("");
              setType("all");
              setSort("top");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </section>
      )}

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Workshop pages">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </nav>
      )}
      {showForm && (
        <SubmissionForm
          client={client}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await queryClient.invalidateQueries({ queryKey: ["workshop"] });
          }}
        />
      )}
    </main>
  );
}

function WorkshopCard({ client, item }: { client: WorkshopClient; item: WorkshopSubmissionSummary }) {
  const image = item.screenshots[0];
  return (
    <article className={styles.card}>
      {image ? (
        <img src={client.fileUrl(item.id, image, "480x320")} alt="" loading="lazy" />
      ) : (
        <div className={styles.cardPlaceholder} aria-hidden>
          {item.type === "widget" ? "{}" : "CSS"}
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{item.type === "widget" ? "Widget" : "CSS theme"}</span>
          <span>
            {item.score >= 0 ? "+" : ""}
            {item.score}
          </span>
        </div>
        <h2>
          <Link className={styles.cardLink} to={`/workshop/${item.id}`}>
            {item.title}
          </Link>
        </h2>
        <p>{item.description || "No description provided."}</p>
        <small>
          By {item.authorName} · revision {item.revision}
        </small>
      </div>
    </article>
  );
}

export function WorkshopDetailRoute() {
  return (
    <WorkshopQueryProvider>
      <WorkshopDetailRouteContent />
    </WorkshopQueryProvider>
  );
}

function WorkshopDetailRouteContent() {
  const client = useWorkshop();
  const queryClient = useQueryClient();
  const location = useLocation();
  const id = location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const history = useHistory();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [actionError, setActionError] = useState("");

  const detailQuery = useQuery({
    queryKey: ["workshop", "detail", id],
    queryFn: ({ signal }) => client.get(id, signal),
    enabled: id.length > 0,
  });
  const voteMutation = useMutation({
    mutationKey: ["workshop", "vote", id],
    mutationFn: async () => {
      await (client.currentUser ?? client.signInWithGitHub());
      return client.vote(id, 1);
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["workshop", "detail", id] }),
    onError: (caught) => setActionError(caught instanceof Error ? caught.message : "The vote could not be saved."),
  });
  const deleteMutation = useMutation({
    mutationKey: ["workshop", "delete", id],
    mutationFn: () => client.delete(id),
    onSuccess: () => history.push("/workshop"),
    onError: (caught) =>
      setActionError(caught instanceof Error ? caught.message : "The submission could not be deleted."),
  });
  useEffect(() => client.subscribeToAuth(setUser), [client]);
  useEffect(() => {
    void client.refreshAuth();
  }, [client]);

  if (detailQuery.isError)
    return (
      <main className={styles.page}>
        <div className={styles.error} role="alert">
          This creation is not saved on this device and Workshop could not be reached.{" "}
          <button onClick={() => void detailQuery.refetch()}>Try again</button>
        </div>
        <Link to="/workshop">Back to Workshop</Link>
      </main>
    );
  if (!detailQuery.data) return <WorkshopSkeleton />;

  const submission = detailQuery.data;
  return (
    <main className={styles.page}>
      <Link to="/workshop">← Back to Workshop</Link>
      <article className={styles.detail}>
        <header>
          <span className={styles.type}>{submission.type === "widget" ? "Widget" : "CSS theme"}</span>
          <h1>{submission.title}</h1>
          <p>{submission.description}</p>
          <small>
            By {submission.authorName} · revision {submission.revision}
          </small>
        </header>
        {submission.screenshots.length > 0 && (
          <div className={styles.gallery}>
            {submission.screenshots.map((image, index) => (
              <img
                key={image}
                src={client.fileUrl(submission.id, image, "960x640")}
                alt={`${submission.title} screenshot ${index + 1}`}
              />
            ))}
          </div>
        )}
        <div className={styles.detailActions}>
          <button className="button button--primary" onClick={() => saveContent(submission)}>
            <IconDownload size={17} /> Download {submission.type === "widget" ? "JSON" : "CSS"}
          </button>
          <button
            className="button button--secondary"
            onClick={() => void navigator.clipboard.writeText(submission.content)}
          >
            <IconCopy size={17} /> Copy source
          </button>
          <button
            className="button button--secondary"
            disabled={voteMutation.isPending}
            onClick={() => {
              setActionError("");
              voteMutation.mutate();
            }}
          >
            Upvote ({submission.upvotes})
          </button>
          <button className="button button--secondary" onClick={() => setReporting(true)}>
            <IconFlag size={16} /> Report
          </button>
          {user?.id === submission.author && (
            <>
              <button className="button button--secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button
                className="button button--danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm("Delete this submission permanently?")) {
                    setActionError("");
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
          {(user?.role === "moderator" || user?.role === "admin") && user.id !== submission.author && (
            <button className="button button--danger" onClick={() => setModerating(true)}>
              Remove submission
            </button>
          )}
        </div>
        {actionError && (
          <div className={styles.error} role="alert">
            {actionError}
          </div>
        )}
        <section>
          <h2>Source</h2>
          <p className={styles.sourceHint}>
            Review this content before using it. Workshop content is never executed on homarr.dev.
          </p>
          <pre className={styles.source}>
            <code>{submission.content}</code>
          </pre>
        </section>
        {submission.changelog && (
          <section>
            <h2>Latest changes</h2>
            <p>{submission.changelog}</p>
          </section>
        )}
      </article>
      {reporting && <ReportForm client={client} submissionId={submission.id} onClose={() => setReporting(false)} />}
      {editing && (
        <SubmissionForm
          client={client}
          existing={submission}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await queryClient.invalidateQueries({ queryKey: ["workshop", "detail", id] });
          }}
        />
      )}
      {moderating && (
        <ModerationRemovalForm
          client={client}
          submission={submission}
          onClose={() => setModerating(false)}
          onRemoved={() => history.push("/workshop/admin")}
        />
      )}
    </main>
  );
}

function ModerationRemovalForm({
  client,
  submission,
  onClose,
  onRemoved,
}: {
  client: WorkshopClient;
  submission: WorkshopSubmissionDetail;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [reason, setReason] = useState("");
  const removeMutation = useMutation({
    mutationKey: ["workshop", "moderation", "remove", submission.id],
    mutationFn: () => client.removeSubmission(submission.id, reason),
    onSuccess: onRemoved,
  });
  return (
    <WorkshopDialog titleId="remove-submission-title" onClose={onClose}>
      <h2 id="remove-submission-title">Remove {submission.title}</h2>
      <p>
        This permanently deletes the submission, files, votes, and reports. A metadata snapshot is retained in
        moderation history.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          removeMutation.mutate();
        }}
      >
        <label>
          Reason
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {removeMutation.error && (
          <p className={styles.error} role="alert">
            {removeMutation.error instanceof Error ? removeMutation.error.message : "Removal failed"}
          </p>
        )}
        <div className={styles.formActions}>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={removeMutation.isPending} className="button button--danger">
            {removeMutation.isPending ? "Removing…" : "Remove permanently"}
          </button>
        </div>
      </form>
    </WorkshopDialog>
  );
}

function SubmissionForm({
  client,
  existing,
  onClose,
  onSaved,
}: {
  client: WorkshopClient;
  existing?: WorkshopSubmissionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<WorkshopSubmissionType>(existing?.type ?? "widget");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [changelog, setChangelog] = useState(existing?.changelog ?? "");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [removedScreenshots, setRemovedScreenshots] = useState<string[]>([]);
  const retainedScreenshotCount = (existing?.screenshots.length ?? 0) - removedScreenshots.length;
  const remainingScreenshotSlots = Math.max(0, MAX_SCREENSHOTS - retainedScreenshotCount);
  useEffect(() => {
    setScreenshots((current) => current.slice(0, remainingScreenshotSlots));
  }, [remainingScreenshotSlots]);
  const saveMutation = useMutation({
    mutationKey: ["workshop", existing ? "update" : "create", existing?.id],
    mutationFn: async (input: WorkshopSubmissionInput) => {
      if (!client.currentUser) await client.signInWithGitHub();
      if (existing) {
        return client.update(existing.id, input, screenshots, removedScreenshots);
      }
      return client.create(input, screenshots);
    },
    onSuccess: onSaved,
  });
  return (
    <WorkshopDialog titleId="submission-form-title" onClose={onClose}>
      <h2 id="submission-form-title">{existing ? "Update creation" : "Share with the community"}</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate({ type, title, description, content, changelog });
        }}
      >
        <label>
          Type
          <select
            disabled={Boolean(existing)}
            value={type}
            onChange={(event) => setType(event.target.value as WorkshopSubmissionType)}
          >
            <option value="widget">Custom widget</option>
            <option value="css">CSS theme</option>
          </select>
        </label>
        <label>
          Title
          <input
            required
            minLength={3}
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          {type === "widget" ? "Widget JSON" : "CSS source"}
          <textarea
            className={styles.editor}
            required
            maxLength={MAX_CONTENT_LENGTH}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <label>
          Changelog
          <textarea maxLength={2000} value={changelog} onChange={(event) => setChangelog(event.target.value)} />
        </label>
        <label>
          Screenshots (PNG, JPG, or WebP, {remainingScreenshotSlots} available)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) =>
              setScreenshots(Array.from(event.target.files ?? []).slice(0, remainingScreenshotSlots))
            }
          />
        </label>
        {existing?.screenshots.map((screenshot) => (
          <label className={styles.checkbox} key={screenshot}>
            <input
              type="checkbox"
              checked={removedScreenshots.includes(screenshot)}
              onChange={(event) =>
                setRemovedScreenshots((current) =>
                  event.target.checked
                    ? [...current, screenshot]
                    : current.filter((filename) => filename !== screenshot),
                )
              }
            />
            Remove existing screenshot {screenshot}
          </label>
        ))}
        {saveMutation.error && (
          <p className={styles.error} role="alert">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Could not save submission"}
          </p>
        )}
        <div className={styles.formActions}>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={saveMutation.isPending} className="button button--primary">
            {saveMutation.isPending ? "Saving…" : existing ? "Save update" : "Publish creation"}
          </button>
        </div>
      </form>
    </WorkshopDialog>
  );
}

function ReportForm({
  client,
  submissionId,
  onClose,
}: {
  client: WorkshopClient;
  submissionId: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<"malicious" | "spam" | "copyright" | "inappropriate" | "other">("malicious");
  const [explanation, setExplanation] = useState("");
  const reportMutation = useMutation({
    mutationKey: ["workshop", "report", submissionId],
    mutationFn: async () => {
      if (!client.currentUser) await client.signInWithGitHub();
      return client.report(submissionId, category, explanation);
    },
    onSuccess: onClose,
  });
  return (
    <WorkshopDialog titleId="report-title" onClose={onClose}>
      <h2 id="report-title">Report submission</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          reportMutation.mutate();
        }}
      >
        <label>
          Reason
          <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            <option value="malicious">Malicious</option>
            <option value="spam">Spam</option>
            <option value="copyright">Copyright</option>
            <option value="inappropriate">Inappropriate</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Details
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
          />
        </label>
        {reportMutation.error && (
          <p className={styles.error} role="alert">
            {reportMutation.error instanceof Error ? reportMutation.error.message : "Could not send report"}
          </p>
        )}
        <div className={styles.formActions}>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={reportMutation.isPending} className="button button--primary">
            {reportMutation.isPending ? "Sending…" : "Submit report"}
          </button>
        </div>
      </form>
    </WorkshopDialog>
  );
}

function WorkshopSkeleton() {
  return (
    <div className={styles.grid} aria-label="Loading Workshop">
      {Array.from({ length: 6 }, (_, index) => (
        <div className={styles.skeleton} key={index} />
      ))}
    </div>
  );
}
