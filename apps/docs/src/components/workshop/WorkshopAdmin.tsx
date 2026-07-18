import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkshopAdminAction, WorkshopReport, WorkshopSubmissionSummary, WorkshopUser } from "@homarr/workshop";
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
  const [actions, setActions] = useState<WorkshopAdminAction[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [nextReports, nextSubmissions, nextActions] = await Promise.all([
        client.listReports(),
        client.listAll({ sort: "newest" }),
        client.listAdminActions(),
      ]);
      setReports(nextReports);
      setSubmissions(nextSubmissions);
      setActions(nextActions);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Workshop administration");
    }
  }, [client]);

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then((next) => {
      setUser(next);
      if (next?.isAdmin) void load();
    });
    return unsubscribe;
  }, [client, load]);

  const grouped = submissions.map((submission) => ({
    submission,
    reports: reports.filter((report) => report.submission === submission.id),
  }));

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>Workshop administration</h1>
        <p>
          Review reports, see each reporter and vote totals, dismiss reports, or delete any submission. This page does
          not manage user accounts.
        </p>
        {!user && (
          <button
            className={styles.button}
            onClick={() =>
              void client.signInWithGitHub().then((next) => {
                setUser(next);
                if (next?.isAdmin) void load();
              })
            }
          >
            Sign in with GitHub
          </button>
        )}
      </section>
      {user && !user.isAdmin && <div className={styles.error}>This Workshop account is not an administrator.</div>}
      {error && <div className={styles.error}>{error}</div>}
      {user?.isAdmin && (
        <div className={styles.stack} style={{ marginTop: "2rem" }}>
          <h2>Submissions and open reports</h2>
          {grouped.map(({ submission, reports: submissionReports }) => (
            <section key={submission.id} className={styles.adminGroup}>
              <div className={styles.meta}>
                <strong>{submission.title}</strong>
                <span>
                  ▲ {submission.upvotes} · ▼ {submission.downvotes} · score {submission.score} ·{" "}
                  {submissionReports.length} reports
                </span>
              </div>
              <p>{submission.description}</p>
              {submissionReports.map((report) => (
                <div key={report.id} className={styles.report}>
                  <strong>{report.category}</strong> by {report.reporterName}
                  <p>{report.explanation}</p>
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      const reason = window.prompt("Why is this report being dismissed?")?.trim();
                      if (reason) void client.dismissReport(report.id, reason).then(load);
                    }}
                  >
                    Dismiss report
                  </button>
                </div>
              ))}
              <div className={styles.actions}>
                <a className={styles.secondary} href={`/workshop?id=${submission.id}`}>
                  Inspect
                </a>
                <button
                  className={styles.danger}
                  onClick={() => {
                    if (window.confirm(`Delete ${submission.title}? Installed local copies will remain.`))
                      void client.delete(submission.id, "Deleted after administrator review").then(load);
                  }}
                >
                  Delete submission
                </button>
              </div>
            </section>
          ))}
          <h2>Administrator audit trail</h2>
          {actions.map((action) => (
            <div key={action.id} className={`${styles.adminGroup} ${styles.audit}`}>
              {new Date(action.created).toLocaleString()} · {action.actorName} · {action.action} · submission{" "}
              {action.submissionId || "—"} · report {action.reportId || "—"}
              <br />
              {action.reason}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
