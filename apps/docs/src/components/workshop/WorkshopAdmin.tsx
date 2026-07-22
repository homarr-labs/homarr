import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconBrandGithub,
  IconExternalLink,
  IconFlag,
  IconLoader2,
  IconRefresh,
  IconShield,
  IconTrash,
} from "@tabler/icons-react";

import { WorkshopBackend } from "@homarr/workshop/backend";
import type { WorkshopReport, WorkshopSubmissionSummary, WorkshopUser } from "@homarr/workshop/schema";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function WorkshopAdmin({ workshopUrl }: { workshopUrl?: string }) {
  const client = useMemo(() => {
    const url = workshopUrl || (typeof window === "undefined" ? "" : window.location.origin);
    return url ? new WorkshopBackend(url) : new WorkshopBackend();
  }, [workshopUrl]);
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [reports, setReports] = useState<WorkshopReport[]>([]);
  const [submissions, setSubmissions] = useState<WorkshopSubmissionSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkshopSubmissionSummary | null>(null);
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

  const signIn = async () => {
    try {
      const nextUser = await client.signInWithGitHub();
      setUser(nextUser);
      if (nextUser?.isAdmin) await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "GitHub sign-in failed");
    }
  };

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

  const remove = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await client.delete(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete submission");
    } finally {
      setBusyId(null);
    }
  };

  const grouped = submissions
    .map((submission) => ({
      submission,
      reports: reports.filter((report) => report.submission === submission.id),
    }))
    .sort((left, right) => Number(right.reports.length > 0) - Number(left.reports.length > 0));

  return (
    <main className="marketplace mx-auto max-w-6xl px-4 pb-20 text-foreground sm:px-6">
      <header className="flex flex-col gap-5 border-b border-border py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <IconShield size={18} />
            <span className="text-sm font-medium">Restricted area</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Workshop administration</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review reports and remove unsafe or outdated submissions. PocketBase rules enforce every action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<a href="/workshop" aria-label="Back to Workshop" />}>
            Back to Workshop
          </Button>
          {!user && (
            <Button onClick={() => void signIn()}>
              <IconBrandGithub size={15} /> Sign in with GitHub
            </Button>
          )}
          {user?.isAdmin && (
            <Button variant="outline" disabled={loading} onClick={() => void load()}>
              <IconRefresh size={15} className={loading ? "animate-spin" : undefined} />
              {loading ? "Refreshing" : "Refresh data"}
            </Button>
          )}
        </div>
      </header>

      <div className="py-6">
        {user && !user.isAdmin && (
          <Alert variant="destructive" className="mb-5">
            <IconShield />
            <AlertTitle>Administrator access required</AlertTitle>
            <AlertDescription>This GitHub account cannot access Workshop moderation.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-5">
            <IconFlag />
            <AlertTitle>Workshop administration failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {user?.isAdmin && (
          <section aria-busy={loading}>
            {reports.length > 0 && (
              <Alert variant="destructive" className="mb-5">
                <IconFlag />
                <AlertTitle>
                  {reports.length} open {reports.length === 1 ? "report needs" : "reports need"} review
                </AlertTitle>
                <AlertDescription>
                  Reported submissions are highlighted and shown first. Dismiss reports that need no action, or delete
                  the submission when it should no longer be available.
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={reports.length > 0 ? "destructive" : "secondary"}>
                {reports.length} open {reports.length === 1 ? "report" : "reports"}
              </Badge>
              <span className="text-muted-foreground">
                {submissions.length} published {submissions.length === 1 ? "submission" : "submissions"}
              </span>
            </div>

            <div className="space-y-4">
              {grouped.map(({ submission, reports: submissionReports }) => (
                <Card
                  key={submission.id}
                  className={
                    submissionReports.length > 0
                      ? "overflow-visible bg-destructive/[0.025] ring-destructive/50"
                      : "overflow-visible"
                  }
                >
                  <CardHeader className="border-b border-border pb-4 sm:grid-cols-[1fr_auto]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-10">
                        {submission.authorAvatarUrl && <AvatarImage src={submission.authorAvatarUrl} alt="" />}
                        <AvatarFallback>{avatarFallback(submission.authorName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{submission.title}</CardTitle>
                        <a
                          href={submission.authorGithubProfileUrl || undefined}
                          target={submission.authorGithubProfileUrl ? "_blank" : undefined}
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {submission.authorName}
                        </a>
                      </div>
                    </div>
                    <Badge variant={submissionReports.length > 0 ? "destructive" : "secondary"}>
                      {submissionReports.length} {submissionReports.length === 1 ? "report" : "reports"}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-1">
                    <div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {submission.description || "No description was provided."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{submission.upvotes} upvotes</span>
                        <span>{submission.downvotes} downvotes</span>
                        <span>Score {submission.score}</span>
                        <span>Updated {new Date(submission.updated).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {submissionReports.length > 0 && (
                      <div className="space-y-3">
                        {submissionReports.map((report) => (
                          <Alert key={report.id} variant="destructive">
                            <IconFlag />
                            <div className="col-start-2 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <AlertTitle className="col-auto capitalize">{report.category} report</AlertTitle>
                                  <p className="m-0 mt-1 text-xs text-destructive/75">
                                    Reported by {report.reporterName} · {new Date(report.created).toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-destructive/30 bg-background/70 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={busyId === report.id}
                                  onClick={() => void dismiss(report.id)}
                                >
                                  {busyId === report.id && <IconLoader2 size={14} className="animate-spin" />}
                                  {busyId === report.id ? "Dismissing" : "Dismiss report"}
                                </Button>
                              </div>
                              <AlertDescription className="col-auto mt-3 whitespace-pre-wrap">
                                {report.explanation}
                              </AlertDescription>
                            </div>
                          </Alert>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={`/workshop/${submission.id}`} aria-label={`Inspect ${submission.title}`} />}
                      >
                        <IconExternalLink size={14} /> Inspect submission
                      </Button>
                      <Button
                        variant={submissionReports.length > 0 ? "destructive" : "ghost"}
                        size="sm"
                        className={submissionReports.length > 0 ? undefined : "text-destructive hover:text-destructive"}
                        onClick={() => setPendingDelete(submission)}
                      >
                        <IconTrash size={14} /> Delete submission
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!loading && grouped.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <IconShield size={28} className="mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No Workshop submissions</p>
                <p className="mt-1 text-sm text-muted-foreground">Published submissions will appear here.</p>
              </div>
            )}
          </section>
        )}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !busyId && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.title}?</DialogTitle>
            <DialogDescription>
              This removes the Workshop listing and its reports, votes, screenshots, and comments. Installed local
              copies remain. The submission author will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={busyId !== null} onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busyId !== null} onClick={() => void remove()}>
              {busyId && <IconLoader2 size={14} className="animate-spin" />}
              {busyId ? "Deleting" : "Delete submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
