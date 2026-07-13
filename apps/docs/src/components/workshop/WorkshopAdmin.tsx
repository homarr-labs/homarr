import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { WorkshopClient, type WorkshopAccountState, type WorkshopRole, type WorkshopUser } from "@homarr/workshop";

import { WorkshopQueryProvider } from "./WorkshopQueryProvider";
import { WorkshopDialog, WorkshopServiceState } from "./WorkshopUi";
import styles from "./workshop.module.css";

type PendingAction =
  | { kind: "report"; id: string; status: "resolved" | "dismissed" }
  | { kind: "state"; id: string; state: WorkshopAccountState }
  | { kind: "role"; id: string; role: WorkshopRole };

export function WorkshopAdmin() {
  return (
    <WorkshopQueryProvider>
      <WorkshopAdminContent />
    </WorkshopQueryProvider>
  );
}

function WorkshopAdminContent() {
  const { siteConfig } = useDocusaurusContext();
  const client = useMemo(
    () => new WorkshopClient((siteConfig.customFields?.workshopApiUrl as string | undefined) || window.location.origin),
    [siteConfig],
  );
  const queryClient = useQueryClient();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const canModerate = user?.role === "moderator" || user?.role === "admin";
  const moderationQuery = useQuery({
    queryKey: ["workshop", "moderation"],
    queryFn: async () => {
      const [reports, users, actions] = await Promise.all([
        client.listReports(),
        client.listUsers(),
        client.listModerationActions(),
      ]);
      return { reports, users, actions };
    },
    enabled: canModerate,
  });
  const reports = moderationQuery.data?.reports ?? [];
  const users = moderationQuery.data?.users ?? [];
  const actions = moderationQuery.data?.actions ?? [];
  const actionMutation = useMutation({
    mutationKey: ["workshop", "moderation", "action"],
    mutationFn: async ({ action, reason }: { action: PendingAction; reason: string }) => {
      if (action.kind === "report") await client.resolveReport(action.id, action.status, reason);
      else if (action.kind === "state") await client.updateAccountState(action.id, action.state, reason);
      else await client.updateRole(action.id, action.role, reason);
    },
    onSuccess: async () => {
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["workshop", "moderation"] });
    },
  });
  const signInMutation = useMutation({
    mutationKey: ["workshop", "auth", "moderator"],
    mutationFn: () => client.signInWithGitHub(),
    onSuccess: setUser,
    onError: (caught) => setError(caught instanceof Error ? caught.message : "GitHub sign-in is unavailable"),
  });

  useEffect(() => client.subscribeToAuth(setUser), [client]);
  useEffect(() => {
    void client
      .refreshAuth()
      .then(setUser)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Workshop authentication is unavailable"),
      )
      .finally(() => setAuthLoading(false));
  }, [client]);

  if (authLoading)
    return (
      <main className={styles.page}>
        <WorkshopAdminSkeleton />
      </main>
    );
  if (!user)
    return (
      <main className={styles.page}>
        <h1>Workshop moderation</h1>
        <p>Sign in with a promoted GitHub account to continue.</p>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <button
          className="button button--primary"
          disabled={signInMutation.isPending}
          onClick={() => {
            setError("");
            signInMutation.mutate();
          }}
        >
          {signInMutation.isPending ? "Connecting…" : "Sign in with GitHub"}
        </button>
      </main>
    );
  if (user.role === "member")
    return (
      <main className={styles.page}>
        <h1>Workshop moderation</h1>
        <div className={styles.error} role="alert">
          Your account does not have moderation access.
        </div>
      </main>
    );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>Workshop moderation</h1>
          <p>Review reports and apply the smallest action needed. Every action requires a reason and is recorded.</p>
        </div>
      </header>
      {(error || moderationQuery.isError) && (
        <WorkshopServiceState
          cached={Boolean(moderationQuery.data)}
          message={error || "Moderation data is unavailable. No action can be applied until Workshop reconnects."}
          onRetry={() => void moderationQuery.refetch()}
        />
      )}
      <section className={styles.adminSection}>
        <h2>Open reports</h2>
        {reports.length === 0 ? (
          <p>No open reports.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Submission</th>
                  <th>Details</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.category}</td>
                    <td>{report.submission}</td>
                    <td>{report.explanation}</td>
                    <td>{new Date(report.created).toLocaleString()}</td>
                    <td aria-label="Report actions">
                      <div className={styles.rowActions}>
                        <button onClick={() => setPending({ kind: "report", id: report.id, status: "resolved" })}>
                          Resolve
                        </button>
                        <button onClick={() => setPending({ kind: "report", id: report.id, status: "dismissed" })}>
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className={styles.adminSection}>
        <h2>Community accounts</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>State</th>
                <th>Moderate</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>{account.displayName}</td>
                  <td>{account.role}</td>
                  <td>{account.state}</td>
                  <td>
                    {account.id === user.id ? (
                      "Current account"
                    ) : (
                      <div className={styles.rowActions}>
                        <button
                          onClick={() =>
                            setPending({
                              kind: "state",
                              id: account.id,
                              state: account.state === "posting_banned" ? "active" : "posting_banned",
                            })
                          }
                        >
                          {account.state === "posting_banned" ? "Lift posting ban" : "Posting ban"}
                        </button>
                        <button
                          onClick={() =>
                            setPending({
                              kind: "state",
                              id: account.id,
                              state: account.state === "disabled" ? "active" : "disabled",
                            })
                          }
                        >
                          {account.state === "disabled" ? "Restore" : "Disable"}
                        </button>
                        {user.role === "admin" && (
                          <button
                            onClick={() =>
                              setPending({
                                kind: "role",
                                id: account.id,
                                role: account.role === "member" ? "moderator" : "member",
                              })
                            }
                          >
                            {account.role === "member" ? "Promote" : "Set member"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.adminSection}>
        <h2>Recent actions</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{action.action}</td>
                  <td>
                    {action.targetType}:{action.targetId}
                  </td>
                  <td>{action.reason}</td>
                  <td>{new Date(action.created).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {pending && (
        <ReasonDialog
          action={pending}
          onClose={() => setPending(null)}
          onConfirm={(reason) => actionMutation.mutateAsync({ action: pending, reason })}
        />
      )}
    </main>
  );
}

function WorkshopAdminSkeleton() {
  return (
    <div aria-label="Loading Workshop moderation">
      <h1>Workshop moderation</h1>
      <p>Loading account and moderation data…</p>
    </div>
  );
}

function ReasonDialog({
  action,
  onClose,
  onConfirm,
}: {
  action: PendingAction;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <WorkshopDialog titleId="moderation-reason-title" onClose={onClose}>
      <h2 id="moderation-reason-title">Confirm moderation action</h2>
      <p>
        This will apply <strong>{action.kind}</strong> to the selected record.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await onConfirm(reason);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Action failed");
            setSaving(false);
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
          <button disabled={saving} className="button button--danger">
            {saving ? "Applying…" : "Apply action"}
          </button>
        </div>
      </form>
    </WorkshopDialog>
  );
}
