import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  WorkshopReport,
  WorkshopSubmissionDetail,
  WorkshopSubmissionInput,
  WorkshopSubmissionSummary,
  WorkshopUser,
} from "@homarr/workshop";
import { validateWorkshopWidget, WorkshopClient, workshopExportFilename } from "@homarr/workshop";
import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";

import { CustomWidgetCodeExample } from "../custom-widget-code";
import styles from "./workshop.module.css";

const emptyDraft: WorkshopSubmissionInput = { title: "", description: "", content: "" };

export function WorkshopPage() {
  const client = useMemo(
    () => new WorkshopClient(typeof window === "undefined" ? undefined : window.location.origin),
    [],
  );
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [items, setItems] = useState<WorkshopSubmissionSummary[]>([]);
  const [reports, setReports] = useState<WorkshopReport[]>([]);
  const [selected, setSelected] = useState<WorkshopSubmissionDetail | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"top" | "newest" | "reported">("top");
  const [draft, setDraft] = useState<WorkshopSubmissionInput>(emptyDraft);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<WorkshopReport["category"]>("other");
  const [reportText, setReportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const draftValidation = useMemo(() => validateWorkshopWidget(draft.content), [draft.content]);
  const reportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => counts.set(report.submission, (counts.get(report.submission) ?? 0) + 1));
    return counts;
  }, [reports]);
  const selectedReports = selected ? reports.filter((report) => report.submission === selected.id) : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReports, nextItems] = await Promise.all([
        user?.isAdmin ? client.listReports() : Promise.resolve([]),
        sort === "reported" && user?.isAdmin
          ? client.listAll({ search, sort: "newest" })
          : client.list({ search, sort: sort === "newest" ? "newest" : "top", perPage: 60 }).then((page) => page.items),
      ]);
      if (sort === "reported") {
        const counts = new Map<string, number>();
        nextReports.forEach((report) => counts.set(report.submission, (counts.get(report.submission) ?? 0) + 1));
        nextItems.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
      }
      setReports(nextReports);
      setItems(nextItems);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workshop is unavailable");
    } finally {
      setLoading(false);
    }
  }, [client, search, sort, user?.isAdmin]);

  const openDetail = useCallback(
    async (id: string) => {
      setBusy(true);
      setError("");
      try {
        setSelected(await client.get(id));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load submission");
      } finally {
        setBusy(false);
      }
    },
    [client],
  );

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    const requestedSubmission = new URLSearchParams(window.location.search).get("id");
    if (requestedSubmission) void openDetail(requestedSubmission);
    return unsubscribe;
  }, [client, openDetail]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!user?.isAdmin && sort === "reported") setSort("top");
  }, [sort, user?.isAdmin]);

  const save = async () => {
    if (!draftValidation.success) {
      setError(draftValidation.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (selected && selected.author === user?.id) await client.update(selected.id, draft, screenshots);
      else await client.create(draft, screenshots);
      setEditorOpen(false);
      setDraft(emptyDraft);
      setScreenshots([]);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to publish");
    } finally {
      setBusy(false);
    }
  };

  const vote = async (value: 1 | -1) => {
    if (!selected) return;
    setError("");
    try {
      await client.vote(selected.id, value);
      await Promise.all([openDetail(selected.id), load()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save vote");
    }
  };

  const dismissReport = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await client.dismissReport(id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to dismiss report");
    } finally {
      setBusy(false);
    }
  };

  const deleteSubmission = async () => {
    if (!selected || !window.confirm(`Delete ${selected.title}? Installed copies will remain.`)) return;
    setBusy(true);
    setError("");
    try {
      await client.delete(selected.id);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete submission");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!selected || reportText.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      await client.report(selected.id, reportCategory, reportText);
      setReportOpen(false);
      setReportText("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to report submission");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>Workshop</h1>
        <p>Discover, inspect, and publish Custom JSX v2 widgets. Submissions are public immediately.</p>
        <div className={styles.actions}>
          {user ? (
            <>
              <span>
                Signed in as <strong>{user.displayName}</strong>
                {user.isAdmin && <span className={styles.adminBadge}>Admin</span>}
              </span>
              <button
                className={styles.secondary}
                onClick={() => {
                  client.signOut();
                  setUser(null);
                }}
              >
                Sign out
              </button>
              <button
                className={styles.button}
                onClick={() => {
                  setSelected(null);
                  setDraft(emptyDraft);
                  setScreenshots([]);
                  setError("");
                  setEditorOpen(true);
                }}
              >
                Publish widget
              </button>
              {user.isAdmin && (
                <a className={styles.secondary} href="/workshop/admin">
                  Review reports
                </a>
              )}
            </>
          ) : (
            <button
              className={styles.button}
              onClick={() =>
                void client
                  .signInWithGitHub()
                  .then(setUser)
                  .catch((cause: Error) => setError(cause.message))
              }
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </section>

      <div className={styles.notice}>
        Inspect API origins, methods, permissions, and JSX before importing. Widget exports must not contain
        credentials.
      </div>
      <div className={styles.toolbar}>
        <input
          className={styles.input}
          aria-label="Search Workshop"
          placeholder="Search widgets"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <select
          className={styles.select}
          style={{ width: 180 }}
          value={sort}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setSort(value === "reported" && user?.isAdmin ? "reported" : value === "newest" ? "newest" : "top");
          }}
        >
          <option value="top">Top rated</option>
          <option value="newest">Newest</option>
          {user?.isAdmin && <option value="reported">Most reported</option>}
        </select>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.grid} aria-busy={loading}>
        {items.map((item) => {
          const reportCount = reportCounts.get(item.id) ?? 0;
          return (
            <article key={item.id} className={`${styles.card} ${reportCount ? styles.reportedCard : ""}`}>
              {item.screenshots[0] ? (
                <img
                  className={styles.previewImage}
                  src={client.fileUrl(item.id, item.screenshots[0], "480x320")}
                  alt=""
                />
              ) : (
                <div className={styles.preview}>JSX</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.meta}>
                  <span>by {item.authorName}</span>
                  <span>
                    ▲ {item.upvotes} · ▼ {item.downvotes}
                  </span>
                </div>
                <span className={item.widgetSchema === CUSTOM_WIDGET_SCHEMA ? styles.success : styles.error}>
                  {item.widgetSchema === CUSTOM_WIDGET_SCHEMA ? "Current" : "Unsupported"} · {item.widgetSchema}
                </span>
                {user?.isAdmin && reportCount > 0 && (
                  <span className={styles.reportCount}>
                    {reportCount} {reportCount === 1 ? "report" : "reports"}
                  </span>
                )}
                <h2>{item.title}</h2>
                <p>{item.description || "No description"}</p>
                <button className={styles.secondary} disabled={busy} onClick={() => void openDetail(item.id)}>
                  Inspect widget
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {loading && items.length === 0 && <p className={styles.empty}>Loading Workshop…</p>}
      {!loading && items.length === 0 && <p className={styles.empty}>No widgets match this search.</p>}

      {selected && (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}
        >
          <dialog open className={`${styles.dialog} ${styles.stack}`} aria-modal="true" aria-label={selected.title}>
            <button type="button" className={styles.dialogClose} aria-label="Close" onClick={() => setSelected(null)}>
              ×
            </button>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className={styles.meta}>
              <span>by {selected.authorName}</span>
              <span>
                ▲ {selected.upvotes} · ▼ {selected.downvotes}
              </span>
            </div>
            <span className={selected.widgetSchema === CUSTOM_WIDGET_SCHEMA ? styles.success : styles.error}>
              {selected.widgetSchema === CUSTOM_WIDGET_SCHEMA ? "Current" : "Unsupported"} · {selected.widgetSchema}
            </span>
            {user?.isAdmin && selectedReports.length > 0 && (
              <section className={styles.moderation} aria-labelledby="submission-reports-title">
                <h3 id="submission-reports-title">
                  {selectedReports.length} {selectedReports.length === 1 ? "report" : "reports"}
                </h3>
                {selectedReports.map((report) => (
                  <div key={report.id} className={styles.moderationReport}>
                    <div>
                      <strong>{report.category}</strong>
                      <span>Reported by {report.reporterName}</span>
                    </div>
                    <p>{report.explanation}</p>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => void dismissReport(report.id)}
                    >
                      Dismiss report
                    </button>
                  </div>
                ))}
              </section>
            )}
            {selected.screenshots.length > 0 && (
              <div className={styles.screenshots}>
                {selected.screenshots.map((file, index) => (
                  <img
                    key={file}
                    src={client.fileUrl(selected.id, file, "960x640")}
                    alt={`${selected.title} screenshot ${index + 1}`}
                  />
                ))}
              </div>
            )}
            <WidgetCapabilitySummary content={selected.content} />
            <CustomWidgetCodeExample
              id={`workshop-submission-${selected.id}`}
              label="widget.json"
              code={selected.content}
              height="340px"
            />
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.secondary} disabled={!user} onClick={() => void vote(1)}>
                ▲ {selected.upvotes}
              </button>
              <button className={styles.secondary} disabled={!user} onClick={() => void vote(-1)}>
                ▼ {selected.downvotes}
              </button>
              <button
                className={styles.danger}
                disabled={!user}
                onClick={() => {
                  setError("");
                  setReportOpen(true);
                }}
              >
                Report
              </button>
              {selected.author === user?.id && (
                <button
                  className={styles.secondary}
                  onClick={() => {
                    setDraft({ title: selected.title, description: selected.description, content: selected.content });
                    setScreenshots([]);
                    setError("");
                    setEditorOpen(true);
                  }}
                >
                  Edit
                </button>
              )}
              {(selected.author === user?.id || user?.isAdmin) && (
                <button className={styles.danger} disabled={busy} onClick={() => void deleteSubmission()}>
                  Delete
                </button>
              )}
              <button
                className={styles.button}
                onClick={() => {
                  const url = URL.createObjectURL(new Blob([selected.content], { type: "application/json" }));
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = workshopExportFilename(selected.title);
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
            </div>
          </dialog>
        </div>
      )}

      {editorOpen && (
        <div className={styles.overlay}>
          <dialog open className={`${styles.dialog} ${styles.stack}`} aria-modal="true" aria-label="Publish widget">
            <h2>{selected?.author === user?.id ? "Update submission" : "Publish widget"}</h2>
            <label className={styles.field}>
              Title
              <input
                className={styles.input}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
              />
            </label>
            <label className={styles.field}>
              Description
              <textarea
                className={styles.textarea}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
              />
            </label>
            <label className={styles.field}>
              Canonical widget.json
              <textarea
                className={styles.textarea}
                style={{ minHeight: 260 }}
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.currentTarget.value })}
              />
              {!draft.content.trim() ? (
                <span className={styles.hint}>Paste a complete Custom Widget manifest.</span>
              ) : draftValidation.success ? (
                <span className={styles.success}>Valid {draftValidation.data.$schema} manifest.</span>
              ) : (
                <span className={styles.error}>{draftValidation.error}</span>
              )}
            </label>
            <label className={styles.field}>
              Screenshots
              <input
                className={styles.input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => setScreenshots(Array.from(event.currentTarget.files ?? []))}
              />
              <span className={styles.hint}>
                {selected?.author === user?.id
                  ? "Choose files to replace the current screenshots, or leave this empty to keep them."
                  : "Up to five images, 5 MiB each."}
              </span>
            </label>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button
                className={styles.button}
                disabled={busy || !user || !draftValidation.success}
                onClick={() => void save()}
              >
                {busy ? "Saving…" : selected?.author === user?.id ? "Save changes" : "Publish immediately"}
              </button>
              <button
                className={styles.secondary}
                onClick={() => {
                  setEditorOpen(false);
                  setScreenshots([]);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </dialog>
        </div>
      )}

      {reportOpen && selected && (
        <div className={styles.overlay}>
          <dialog open className={`${styles.dialog} ${styles.stack}`} aria-modal="true" aria-label="Report submission">
            <h2>Report {selected.title}</h2>
            <label className={styles.field}>
              Category
              <select
                className={styles.select}
                value={reportCategory}
                onChange={(event) => setReportCategory(event.currentTarget.value as WorkshopReport["category"])}
              >
                {["malicious", "spam", "copyright", "inappropriate", "other"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Explanation
              <textarea
                className={styles.textarea}
                value={reportText}
                onChange={(event) => setReportText(event.currentTarget.value)}
              />
            </label>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button
                className={styles.danger}
                disabled={busy || reportText.trim().length < 3}
                onClick={() => void submitReport()}
              >
                Send report
              </button>
              <button className={styles.secondary} onClick={() => setReportOpen(false)}>
                Cancel
              </button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}

function WidgetCapabilitySummary({ content }: { content: string }) {
  const result = validateWorkshopWidget(content);
  if (!result.success) return <div className={styles.error}>{result.error}</div>;
  return (
    <div className={styles.capabilities}>
      <section>
        <strong>API sources</strong>
        {Object.entries(result.data.sources).map(([sourceId, source]) => (
          <p key={sourceId}>
            <code>{new URL(source.baseUrl).origin}</code> · {source.networkScope} ·{" "}
            {typeof source.auth === "string" ? source.auth : source.auth.type}
          </p>
        ))}
      </section>
      <section>
        <strong>Requests and permissions</strong>
        {Object.keys(result.data.requests).length === 0 ? (
          <p>No network requests</p>
        ) : (
          Object.entries(result.data.requests).map(([requestId, request]) => (
            <p key={requestId}>
              <code>{requestId}</code> · {request.kind} · {request.method} · {request.permission}
            </p>
          ))
        )}
      </section>
    </div>
  );
}
