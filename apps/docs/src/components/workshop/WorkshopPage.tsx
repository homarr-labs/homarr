import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@docusaurus/Link";
import { useHistory, useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconCopy,
  IconDownload,
  IconFlag,
  IconSearch,
  IconUpload,
} from "@tabler/icons-react";

import {
  WORKSHOP_API_URL,
  WorkshopClient,
  type WorkshopSubmissionDetail,
  type WorkshopSubmissionInput,
  type WorkshopSubmissionSummary,
  type WorkshopSubmissionType,
  type WorkshopUser,
  workshopExportFilename,
} from "@homarr/workshop";

import styles from "./workshop.module.css";

const useWorkshop = () => {
  const { siteConfig } = useDocusaurusContext();
  const apiUrl = (siteConfig.customFields?.workshopApiUrl as string | undefined) ?? WORKSHOP_API_URL;
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
  const client = useWorkshop();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [items, setItems] = useState<WorkshopSubmissionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<WorkshopSubmissionType | "all">("all");
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => client.subscribeToAuth(setUser), [client]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await client.refreshAuth();
      const result = await client.list({ page, type, sort, search, author: mine ? client.currentUser?.id : undefined });
      setItems(result.items);
      setTotalPages(result.totalPages);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workshop is unavailable");
    } finally {
      setLoading(false);
    }
  }, [client, mine, page, search, sort, type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const signIn = async () => {
    try {
      await client.signInWithGitHub();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>Workshop</h1>
          <p>Community widgets and CSS themes, ready to inspect and use in Homarr.</p>
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
            <button className="button button--primary" onClick={() => void signIn()}>
              <IconBrandGithub size={18} /> Sign in with GitHub
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

      {error && (
        <div className={styles.error} role="alert">
          {error} <button onClick={() => void load()}>Try again</button>
        </div>
      )}
      {loading ? (
        <WorkshopSkeleton />
      ) : items.length ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <WorkshopCard client={client} item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <section className={styles.empty}>
          <h2>No creations found</h2>
          <p>Adjust the filters, or share the first creation in this category.</p>
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
            await load();
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
          <Link to={`/workshop/${item.id}`}>{item.title}</Link>
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
  const client = useWorkshop();
  const location = useLocation();
  const id = location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const history = useHistory();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [submission, setSubmission] = useState<WorkshopSubmissionDetail | null>(null);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moderating, setModerating] = useState(false);

  const load = useCallback(async () => {
    try {
      setSubmission(await client.get(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submission not found");
    }
  }, [client, id]);
  useEffect(() => client.subscribeToAuth(setUser), [client]);
  useEffect(() => {
    void client.refreshAuth();
    void load();
  }, [client, load]);

  if (error)
    return (
      <main className={styles.page}>
        <div className={styles.error} role="alert">
          {error}
        </div>
        <Link to="/workshop">Back to Workshop</Link>
      </main>
    );
  if (!submission) return <WorkshopSkeleton />;

  const requireAuth = async () => client.currentUser ?? client.signInWithGitHub();
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
            onClick={async () => {
              await requireAuth();
              await client.vote(submission.id, 1);
              await load();
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
                onClick={async () => {
                  if (window.confirm("Delete this submission permanently?")) {
                    await client.delete(submission.id);
                    history.push("/workshop");
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
            await load();
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
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className={styles.overlay}>
      <dialog className={styles.dialog} open aria-labelledby="remove-submission-title">
        <h2 id="remove-submission-title">Remove {submission.title}</h2>
        <p>
          This permanently deletes the submission, files, votes, and reports. A metadata snapshot is retained in
          moderation history.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            try {
              await client.removeSubmission(submission.id, reason);
              onRemoved();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Removal failed");
              setPending(false);
            }
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
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="button" className="button button--secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={pending} className="button button--danger">
              {pending ? "Removing…" : "Remove permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
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
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const input: WorkshopSubmissionInput = { type, title, description, content, changelog };
    try {
      if (!client.currentUser) await client.signInWithGitHub();
      if (existing) {
        await client.update(existing.id, input, screenshots, removedScreenshots);
      } else {
        await client.create(input, screenshots);
      }
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save submission");
    } finally {
      setPending(false);
    }
  };
  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog className={styles.dialog} open aria-labelledby="submission-form-title">
        <h2 id="submission-form-title">{existing ? "Update creation" : "Share with the community"}</h2>
        <form onSubmit={(event) => void submit(event)}>
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
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <label>
            Changelog
            <textarea maxLength={2000} value={changelog} onChange={(event) => setChangelog(event.target.value)} />
          </label>
          <label>
            Screenshots (PNG, JPG, or WebP, up to 5)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => setScreenshots(Array.from(event.target.files ?? []).slice(0, 5))}
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
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.formActions}>
            <button type="button" className="button button--secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={pending} className="button button--primary">
              {pending ? "Saving…" : existing ? "Save update" : "Publish creation"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
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
  const [error, setError] = useState("");
  return (
    <div className={styles.overlay}>
      <dialog className={styles.dialog} open aria-labelledby="report-title">
        <h2 id="report-title">Report submission</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              if (!client.currentUser) await client.signInWithGitHub();
              await client.report(submissionId, category, explanation);
              onClose();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not send report");
            }
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
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="button" className="button button--secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="button button--primary">Submit report</button>
          </div>
        </form>
      </dialog>
    </div>
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
