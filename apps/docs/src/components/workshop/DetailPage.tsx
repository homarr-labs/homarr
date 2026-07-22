import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import {
  IconArrowBigDown,
  IconArrowBigUp,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFlag,
  IconInfoCircle,
  IconLoader2,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import type { ClientResponseError } from "pocketbase";

import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";
import {
  getPocketBase,
  getSubmissionFileUrl,
  parseWorkshopSubmission,
  signInWithGitHub,
} from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/workshop-schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomWidgetCodeExample, CustomWidgetCodeInput } from "../custom-widget-code";
import { validateSubmissionContent } from "@site/src/lib/workshop-schema";
import { cn, errorMessage, oauthErrorMessage } from "@site/src/lib/utils";

import { CommentsSection } from "./DetailComments";
import { CodeBlock, DeleteConfirmButton, DetailSkeleton, ScreenshotGallery } from "./DetailSections";
import { formatRelativeTime } from "./format";
import { WorkshopErrorBoundary } from "./WorkshopErrorBoundary";
import { downloadSubmissionJson, voteDelta } from "./workshop-utils";

const typeLabels: Record<SubmissionType, string> = { customCss: "CSS", customWidget: "Widget" };
const typeDotColors: Record<SubmissionType, string> = { customCss: "bg-blue-500", customWidget: "bg-yellow-500" };
const contentLanguages: Record<SubmissionType, string> = { customCss: "css", customWidget: "json" };
const copyState = [
  { Icon: IconCopy, iconClass: "" },
  { Icon: IconCheck, iconClass: "text-green-500" },
] as const;
const scoreClassBySign = { positive: "text-foreground", negative: "text-destructive", neutral: "" } as const;

const scoreSign = (score: number): keyof typeof scoreClassBySign => {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
};

const parseSubmissionId = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last === "workshop") return null;
  return last;
};

const isNotFound = (caught: unknown) =>
  typeof caught === "object" && caught !== null && "status" in caught && (caught as ClientResponseError).status === 404;

const MarketplaceDetail = ({ workshopUrl }: { workshopUrl: string }) => {
  const location = useLocation();
  const submissionId = parseSubmissionId(location.pathname);
  const pb = useMemo(() => getPocketBase(workshopUrl), [workshopUrl]);

  const [submission, setSubmission] = useState<WorkshopSubmission | null>(null);
  const [userVote, setUserVote] = useState<WorkshopVote | undefined>();
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editChangelog, setEditChangelog] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("other");
  const [reportExplanation, setReportExplanation] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const copyFailedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const voting = useRef(false);

  const requireUserId = useCallback(
    async (action: string) => {
      if (!pb.authStore.isValid) {
        try {
          await signInWithGitHub(pb);
        } catch (caught) {
          setError(oauthErrorMessage(caught));
          return null;
        }
      }
      const userId = pb.authStore.record?.id;
      if (!userId) {
        setError(`Sign in to ${action}`);
        return null;
      }
      return userId;
    },
    [pb],
  );

  useEffect(() => {
    if (pb.authStore.isValid)
      pb.collection("users")
        .authRefresh()
        .catch(() => pb.authStore.clear());
    return pb.authStore.onChange(() => setUser(pb.authStore.record));
  }, [pb]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (copyFailedTimer.current) clearTimeout(copyFailedTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!submissionId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    const load = async () => {
      try {
        const [listing, record] = await Promise.all([
          pb.collection("workshop_listings").getOne<WorkshopSubmission>(submissionId),
          pb.collection("submissions").getOne<WorkshopSubmission>(submissionId),
        ]);
        if (cancelled) return;
        const parsed = parseWorkshopSubmission({ ...listing, ...record, content: record.content });
        if (!parsed) throw new Error("This Workshop submission has an invalid record shape");
        setSubmission(parsed);

        if (pb.authStore.isValid && pb.authStore.record) {
          const votes = await pb.collection("votes").getFullList<WorkshopVote>({
            filter: pb.filter("user = {:uid} && submission = {:sid}", {
              uid: pb.authStore.record.id,
              sid: submissionId,
            }),
          });
          if (!cancelled) setUserVote(votes[0]);
        }
      } catch (caught) {
        if (cancelled) return;
        if (isNotFound(caught)) setNotFound(true);
        else setError(errorMessage(caught, "Failed to load submission"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [pb, submissionId, reloadKey]);

  const screenshotUrls = useMemo(
    () => submission?.screenshots?.map((f) => getSubmissionFileUrl(pb.baseURL, submission.id, f)) ?? [],
    [submission, pb],
  );

  const handleVote = async (value: 1 | -1) => {
    if (!submission || voting.current) return;
    voting.current = true;

    const userId = await requireUserId("vote");
    if (!userId) {
      voting.current = false;
      return;
    }

    const prev = userVote;
    const isToggleOff = prev?.value === value;
    const [upD, downD] = voteDelta(prev?.value, value);

    setUserVote(
      isToggleOff
        ? undefined
        : ({ ...(prev ?? { id: "", submission: submission.id, user: userId }), value } as WorkshopVote),
    );
    setSubmission((s) => (s ? { ...s, upvotes: s.upvotes + upD, downvotes: s.downvotes + downD } : s));

    try {
      if (!prev) {
        const created = await pb
          .collection("votes")
          .create<WorkshopVote>({ submission: submission.id, value, user: userId });
        setUserVote(created);
      } else if (isToggleOff) {
        await pb.collection("votes").delete(prev.id);
      } else {
        await pb.collection("votes").update(prev.id, { value });
      }
    } catch (caught) {
      setUserVote(prev);
      setSubmission((s) => (s ? { ...s, upvotes: s.upvotes - upD, downvotes: s.downvotes - downD } : s));
      setError(errorMessage(caught, "Failed to register your vote"));
    } finally {
      voting.current = false;
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    try {
      await pb.collection("submissions").delete(submission.id);
      window.location.href = "/workshop/";
    } catch (caught) {
      setError(errorMessage(caught, "Failed to delete submission"));
    }
  };

  const handleOutdated = async () => {
    if (!submission) return;
    try {
      const updated = await pb.collection("submissions").update<WorkshopSubmission>(submission.id, {
        outdated: !submission.outdated,
      });
      setSubmission({ ...submission, outdated: updated.outdated });
    } catch (caught) {
      setError(errorMessage(caught, "Failed to update submission status"));
    }
  };

  const openEdit = () => {
    if (!submission) return;
    setEditTitle(submission.title);
    setEditDescription(submission.description);
    setEditChangelog("");
    setEditContent(submission.content);
    setEditError(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!submission) return;
    const validation = validateSubmissionContent(submission.type, editContent);
    if (!validation.success) {
      setEditError(validation.error);
      return;
    }
    setEditPending(true);
    setEditError(null);
    try {
      const updated = await pb.collection("submissions").update<WorkshopSubmission>(submission.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        content: editContent,
        changelog: editChangelog.trim(),
        revision: submission.revision + 1,
      });
      setSubmission({ ...submission, ...updated, revision: submission.revision + 1 });
      setEditOpen(false);
      setError(null);
    } catch (caught) {
      setEditError(errorMessage(caught, "Failed to update submission"));
    } finally {
      setEditPending(false);
    }
  };

  const handleReport = async () => {
    if (!submission) return;
    const userId = await requireUserId("report this submission");
    if (!userId) return;
    setReportPending(true);
    setReportError(null);
    try {
      await pb.collection("reports").create({
        submission: submission.id,
        reporter: userId,
        category: reportCategory,
        explanation: reportExplanation.trim(),
        status: "open",
      });
      setReportOpen(false);
      setReportExplanation("");
    } catch (caught) {
      setReportError(errorMessage(caught, "Failed to submit report"));
    } finally {
      setReportPending(false);
    }
  };

  const handleCopy = async () => {
    if (!submission) return;
    try {
      await navigator.clipboard.writeText(submission.content);
      setCopied(true);
      setCopyFailed(false);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (copyFailedTimer.current) clearTimeout(copyFailedTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
      if (copyFailedTimer.current) clearTimeout(copyFailedTimer.current);
      copyFailedTimer.current = setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error && !submission) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <IconX size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Submission could not be loaded</h1>
          <p className="mt-1 text-sm text-muted-foreground">Check the Workshop service and try again.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
            <IconRefresh size={15} /> Try loading again
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/workshop" />}>
            Back to Workshop
          </Button>
        </div>
      </div>
    );
  }

  if (notFound || !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg font-medium">Submission not found</p>
        <p className="mt-1 text-sm text-muted-foreground">This listing may have been removed or the link is invalid.</p>
        <Link
          to="/workshop"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <IconArrowLeft size={14} /> Back to Workshop
        </Link>
      </div>
    );
  }

  const score = submission.upvotes - submission.downvotes;
  const { Icon: CopyIcon, iconClass: copyIconClass } = copyState[Number(copied)];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <Link
        to="/workshop"
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <IconArrowLeft size={14} /> Back to Workshop
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {screenshotUrls.length > 0 && (
        <div className="mb-6">
          <ScreenshotGallery urls={screenshotUrls} title={submission.title} />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{submission.title}</h1>
            <Badge variant="secondary" className="gap-1.5">
              <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
              {typeLabels[submission.type]}
            </Badge>
            {submission.outdated && <Badge variant="secondary">Outdated</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <a
              href={submission.authorGithubProfileUrl || undefined}
              target={submission.authorGithubProfileUrl ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              {submission.authorAvatarUrl && (
                <img src={submission.authorAvatarUrl} alt="" className="size-5 rounded-full object-cover" />
              )}
              {submission.authorName}
            </a>{" "}
            · v{submission.revision} · {formatRelativeTime(submission.created)}
          </p>
        </div>

        <div className="flex items-center gap-px rounded-md border border-border bg-muted/40 p-px">
          <button
            type="button"
            onClick={() => void handleVote(1)}
            aria-label="Upvote"
            aria-pressed={userVote?.value === 1}
            className={cn(
              "flex size-10 items-center justify-center rounded-[5px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-9",
              userVote?.value === 1 && "bg-primary/15 text-primary",
            )}
          >
            <IconArrowBigUp size={18} />
          </button>
          <span
            className={cn("min-w-6 text-center text-sm font-semibold tabular-nums", scoreClassBySign[scoreSign(score)])}
          >
            {score}
          </span>
          <button
            type="button"
            onClick={() => void handleVote(-1)}
            aria-label="Downvote"
            aria-pressed={userVote?.value === -1}
            className={cn(
              "flex size-10 items-center justify-center rounded-[5px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-9",
              userVote?.value === -1 && "bg-primary/15 text-primary",
            )}
          >
            <IconArrowBigDown size={18} />
          </button>
        </div>
      </div>

      {submission.description && (
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{submission.description}</p>
      )}
      {submission.changelog && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Changelog</p>
          <p className="mt-1 text-sm">{submission.changelog}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {submission.type === "customWidget" && (
          <Button className="h-10 sm:h-7" size="sm" onClick={() => downloadSubmissionJson(submission)}>
            <IconDownload size={14} /> Download widget JSON
          </Button>
        )}
        <Button
          className="h-10 sm:h-7"
          variant={submission.type === "customCss" ? "default" : "outline"}
          size="sm"
          onClick={() => void handleCopy()}
        >
          {copyFailed ? (
            <>
              <IconX size={14} className="text-destructive" /> Copy failed
            </>
          ) : (
            <>
              <CopyIcon size={14} className={copyIconClass} />
              {copied ? "Copied" : submission.type === "customCss" ? "Copy CSS" : "Copy widget JSON"}
            </>
          )}
        </Button>
        <Button className="h-10 sm:h-7" variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
          <IconFlag size={14} /> Report submission
        </Button>
        {(user?.id === submission.author || user?.isAdmin === true) && (
          <Button className="h-10 sm:h-7" variant="outline" size="sm" onClick={() => void handleOutdated()}>
            {submission.outdated ? "Mark current" : "Mark outdated"}
          </Button>
        )}
        {user?.id === submission.author && (
          <Button className="h-10 sm:h-7" variant="outline" size="sm" onClick={openEdit}>
            Edit submission
          </Button>
        )}
        {(user?.id === submission.author || user?.isAdmin === true) && <DeleteConfirmButton onConfirm={handleDelete} />}
      </div>

      <div className="mt-4 flex gap-3 rounded-lg bg-muted/40 p-4 text-sm">
        <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Install in Homarr</p>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {submission.type === "customWidget"
              ? "Download the JSON, then open Manage → Custom Widgets → Import in your Homarr instance. Homarr asks for any required credentials during import."
              : "Copy the CSS, then open your board settings and paste it into Custom CSS."}{" "}
            <Link to="/docs/management/workshop/" className="font-medium text-primary hover:underline">
              Read the installation guide
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6">
        {submission.type === "customWidget" ? (
          <CustomWidgetCodeExample
            id={`workshop-${submission.id}`}
            label="widget.json"
            code={submission.content}
            language="json"
            height="520px"
          />
        ) : (
          <CodeBlock content={submission.content} language={contentLanguages[submission.type]} />
        )}
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <CommentsSection
          submissionId={submission.id}
          pb={pb}
          currentUserId={user?.id}
          currentUserIsAdmin={user?.isAdmin === true}
          onRequireAuth={requireUserId}
          onError={setError}
        />
      </div>
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (reportPending) return;
          setReportOpen(open);
          if (!open) setReportError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report submission</DialogTitle>
            <DialogDescription>
              Only Workshop administrators can review report details and reporter identities.
            </DialogDescription>
          </DialogHeader>
          {reportError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {reportError}
            </div>
          )}
          <label htmlFor="workshop-report-category" className="grid gap-1.5 text-sm">
            Category
            <select
              id="workshop-report-category"
              className="h-10 rounded-md border border-input bg-transparent px-3"
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
            >
              <option value="malicious">Malicious</option>
              <option value="spam">Spam</option>
              <option value="copyright">Copyright</option>
              <option value="inappropriate">Inappropriate</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label htmlFor="workshop-report-explanation" className="grid gap-1.5 text-sm">
            Explanation
            <Textarea
              id="workshop-report-explanation"
              value={reportExplanation}
              onChange={(event) => setReportExplanation(event.target.value)}
              placeholder="Explain what should be reviewed"
              maxLength={1000}
              rows={5}
            />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={reportPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reportPending || reportExplanation.trim().length < 3}
              onClick={() => void handleReport()}
            >
              {reportPending && <IconLoader2 size={14} className="animate-spin" />}
              {reportPending ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!editPending) setEditOpen(open);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit submission</DialogTitle>
            <DialogDescription>Saving creates a new revision and keeps the same Workshop URL.</DialogDescription>
          </DialogHeader>
          {editError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {editError}
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
            <CustomWidgetCodeInput
              id="workshop-edit-content"
              label={submission.type === "customWidget" ? "Widget JSON" : "Custom CSS"}
              language={submission.type === "customWidget" ? "json" : "css"}
              value={editContent}
              onChange={setEditContent}
              height="min(46vh, 460px)"
              required
            />
            <div className="flex flex-col gap-4">
              <label htmlFor="workshop-edit-title" className="grid gap-1.5 text-sm">
                Title
                <Input
                  id="workshop-edit-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </label>
              <label htmlFor="workshop-edit-description" className="grid gap-1.5 text-sm">
                Description
                <Textarea
                  id="workshop-edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={5}
                />
              </label>
              <label htmlFor="workshop-edit-changelog" className="grid gap-1.5 text-sm">
                Changelog
                <Textarea
                  id="workshop-edit-changelog"
                  value={editChangelog}
                  onChange={(event) => setEditChangelog(event.target.value)}
                  placeholder="What changed?"
                  rows={4}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={editPending}>
              Cancel
            </Button>
            <Button
              disabled={editPending || editTitle.trim().length < 3 || !editContent.trim()}
              onClick={() => void handleEdit()}
            >
              {editPending && <IconLoader2 size={14} className="animate-spin" />}
              {editPending ? "Saving…" : "Save revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function MarketplaceDetailPage() {
  const { siteConfig } = useDocusaurusContext();
  const configuredWorkshopUrl = (siteConfig.customFields?.workshopUrl as string | undefined) ?? "";

  return (
    <Layout title="Workshop" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<DetailSkeleton />}>
          {() => (
            <WorkshopErrorBoundary>
              <MarketplaceDetail workshopUrl={configuredWorkshopUrl || window.location.origin} />
            </WorkshopErrorBoundary>
          )}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
