import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkshopReport, WorkshopSubmissionSummary, WorkshopUser } from "@homarr/workshop";
import { WorkshopClient } from "@homarr/workshop";

import styles from "./workshop.module.css";

export function WorkshopAdmin() {
  const client = useMemo(
    () => new WorkshopClient(typeof window === "undefined" ? undefined : window.location.origin),
    [],
  );
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [reports, setReports] = useState<WorkshopReport[]>([]);
  const [submissions, setSubmissions] = useState<WorkshopSubmissionSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReports, nextSubmissions] = await Promise.all([
        client.listReports(),
        client.listAll({ sort: "newest" }),
      ]);
      setReports(nextReports);
      setSubmissions(nextSubmissions);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Workshop administration");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then((nextUser) => {
      setUser(nextUser);
      if (nextUser?.isAdmin) void load();
    });
    return unsubscribe;
  }, [client, load]);

  const dismiss = async (reportId: string) => {
    setBusyId(reportId);
    try {
      await client.dismissReport(reportId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to dismiss report");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (submission: WorkshopSubmissionSummary) => {
    if (!window.confirm(`Delete ${submission.title}? Installed local copies will remain.`)) return;
    setBusyId(submission.id);
    try {
      await client.delete(submission.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete submission");
    } finally {
      setBusyId(null);
    }
  };

  const grouped = submissions.map((submission) => ({
    submission,
    reports: reports.filter((report) => report.submission === submission.id),
  }));

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>Workshop administration</h1>
        <p>Review community reports and remove submissions. PocketBase rules enforce every moderation action.</p>
        <div className={styles.actions}>
          <a className={styles.secondary} href="/workshop">
            Back to Workshop
          </a>
          {!user && (
            <button
              className={styles.button}
              onClick={() =>
                void client
                  .signInWithGitHub()
                  .then((nextUser) => {
                    setUser(nextUser);
                    if (nextUser?.isAdmin) void load();
                  })
                  .catch((cause: Error) => setError(cause.message))
              }
            >
              Sign in with GitHub
            </button>
          )}
          {user?.isAdmin && (
            <button className={styles.secondary} disabled={loading} onClick={() => void load()}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      </section>

      {user && !user.isAdmin && <div className={styles.error}>This Workshop account is not an administrator.</div>}
      {error && <div className={styles.error}>{error}</div>}
      {user?.isAdmin && (
        <section className={styles.adminList} aria-busy={loading}>
          <div className={styles.adminSummary}>
            <strong>{reports.length} open reports</strong>
            <span>{submissions.length} published widgets</span>
          </div>
          {grouped.map(({ submission, reports: submissionReports }) => (
            <article key={submission.id} className={styles.adminGroup}>
              <div className={styles.adminHeading}>
                <div>
                  <h2>{submission.title}</h2>
                  <span>by {submission.authorName}</span>
                </div>
                <span className={submissionReports.length > 0 ? styles.reportCount : undefined}>
                  {submissionReports.length} {submissionReports.length === 1 ? "report" : "reports"}
                </span>
              </div>
              <p>{submission.description || "No description"}</p>
              <div className={styles.meta}>
                <span>
                  ▲ {submission.upvotes} · ▼ {submission.downvotes} · score {submission.score}
                </span>
                <span>Updated {new Date(submission.updated).toLocaleDateString()}</span>
              </div>
              {submissionReports.map((report) => (
                <div key={report.id} className={styles.moderationReport}>
                  <div>
                    <strong>{report.category}</strong>
                    <span>Reported by {report.reporterName}</span>
                  </div>
                  <p>{report.explanation}</p>
                  <button
                    className={styles.secondary}
                    disabled={busyId === report.id}
                    onClick={() => void dismiss(report.id)}
                  >
                    {busyId === report.id ? "Dismissing…" : "Dismiss report"}
                  </button>
                </div>
              ))}
              <div className={styles.actions}>
                <a className={styles.secondary} href={`/workshop?id=${submission.id}`}>
                  Inspect
                </a>
                <button
                  className={styles.danger}
                  disabled={busyId === submission.id}
                  onClick={() => void remove(submission)}
                >
                  {busyId === submission.id ? "Deleting…" : "Delete submission"}
                </button>
              </div>
            </article>
          ))}
          {!loading && grouped.length === 0 && <p className={styles.empty}>No Workshop submissions.</p>}
        </section>
      )}
    </main>
  );
}
