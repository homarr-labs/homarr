import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  WorkshopReport,
  WorkshopSubmissionDetail,
  WorkshopSubmissionInput,
  WorkshopSubmissionSummary,
  WorkshopUser,
} from "@homarr/workshop";
import { validateWorkshopWidget, WorkshopClient } from "@homarr/workshop";

import styles from "./workshop.module.css";

const emptyDraft: WorkshopSubmissionInput = {
  title: "",
  description: "",
  content: "",
  changelog: "Initial publication",
};

export function WorkshopPage() {
  const client = useMemo(
    () => new WorkshopClient(typeof window === "undefined" ? undefined : window.location.origin),
    [],
  );
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [items, setItems] = useState<WorkshopSubmissionSummary[]>([]);
  const [selected, setSelected] = useState<WorkshopSubmissionDetail | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [draft, setDraft] = useState<WorkshopSubmissionInput>(emptyDraft);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<WorkshopReport["category"]>("other");
  const [reportText, setReportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems((await client.list({ search, sort, perPage: 60 })).items);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workshop is unavailable");
    }
  }, [client, search, sort]);

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

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (selected && selected.author === user?.id) await client.update(selected.id, draft, screenshots);
      else await client.create(draft, screenshots);
      setEditorOpen(false);
      setDraft(emptyDraft);
      setScreenshots([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to publish");
    } finally {
      setBusy(false);
    }
  };

  const edit = () => {
    if (!selected) return;
    setDraft({
      title: selected.title,
      description: selected.description,
      content: selected.content,
      changelog: selected.changelog,
    });
    setEditorOpen(true);
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>Workshop</h1>
        <p>
          Discover and publish Custom JSX v2 widgets. Every submission is public immediately; the community can vote and
          report unsafe content.
        </p>
        <div className={styles.actions}>
          {user ? (
            <>
              <span>
                Signed in as <strong>{user.displayName}</strong>
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
                  setEditorOpen(true);
                }}
              >
                Publish widget
              </button>
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
        Inspect API origins, methods, permissions, and JSX before importing. Workshop never stores widget credentials.
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
          onChange={(event) => setSort(event.currentTarget.value as "top" | "newest")}
        >
          <option value="top">Top rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
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
                <span>Revision {item.revision}</span>
                <span>
                  ▲ {item.upvotes} · ▼ {item.downvotes}
                </span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.description || "No description"}</p>
              <small>by {item.authorName}</small>
              <button className={styles.secondary} disabled={busy} onClick={() => void openDetail(item.id)}>
                Inspect widget
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}
        >
          <dialog open className={`${styles.dialog} ${styles.stack}`} aria-modal="true" aria-label={selected.title}>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className={styles.meta}>
              <span>
                by {selected.authorName} · revision {selected.revision}
              </span>
              <span>SHA-256 {selected.contentHash.slice(0, 12)}…</span>
            </div>
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
            <pre className={styles.code}>{selected.content}</pre>
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                disabled={!user}
                onClick={() =>
                  void client
                    .vote(selected.id, 1)
                    .then(() => openDetail(selected.id))
                    .then(load)
                }
              >
                ▲ {selected.upvotes}
              </button>
              <button
                className={styles.secondary}
                disabled={!user}
                onClick={() =>
                  void client
                    .vote(selected.id, -1)
                    .then(() => openDetail(selected.id))
                    .then(load)
                }
              >
                ▼ {selected.downvotes}
              </button>
              <button className={styles.danger} disabled={!user} onClick={() => setReportOpen(true)}>
                Report
              </button>
              {selected.author === user?.id && (
                <>
                  <button className={styles.secondary} onClick={edit}>
                    Edit
                  </button>
                  <button
                    className={styles.danger}
                    onClick={() =>
                      void client.delete(selected.id).then(() => {
                        setSelected(null);
                        return load();
                      })
                    }
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                className={styles.button}
                onClick={() => {
                  const url = URL.createObjectURL(new Blob([selected.content], { type: "application/json" }));
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${selected.title}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
              <button className={styles.secondary} onClick={() => setSelected(null)}>
                Close
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
            </label>
            <label className={styles.field}>
              Changelog
              <textarea
                className={styles.textarea}
                value={draft.changelog}
                onChange={(event) => setDraft({ ...draft, changelog: event.currentTarget.value })}
              />
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
              <span className={styles.hint}>Up to five images, 5 MiB each.</span>
            </label>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.button} disabled={busy || !user} onClick={() => void save()}>
                {busy ? "Publishing…" : "Publish immediately"}
              </button>
              <button className={styles.secondary} onClick={() => setEditorOpen(false)}>
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
            <div className={styles.actions}>
              <button
                className={styles.danger}
                disabled={reportText.trim().length < 3}
                onClick={() =>
                  void client.report(selected.id, reportCategory, reportText).then(() => {
                    setReportOpen(false);
                    setReportText("");
                  })
                }
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
        {result.data.sources.map((source) => (
          <p key={source.id}>
            <code>{new URL(source.baseUrl).origin}</code> · {source.networkScope} · {source.auth.type}
          </p>
        ))}
      </section>
      <section>
        <strong>Requests and permissions</strong>
        {result.data.requests.length === 0 ? (
          <p>No network requests</p>
        ) : (
          result.data.requests.map((request) => (
            <p key={request.id}>
              <code>{request.id}</code> · {request.kind} · {request.method} · {request.minimumBoardPermission}
            </p>
          ))
        )}
      </section>
    </div>
  );
}
