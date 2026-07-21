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
  IconX,
} from "@tabler/icons-react";
import type { ClientResponseError } from "pocketbase";

import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";
import { getPocketBase, getSubmissionFileUrl, signInWithGitHub } from "@site/src/lib/pocketbase";
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
import { CustomWidgetCodeExample } from "../custom-widget-code";
import { validateSubmissionContent } from "@site/src/lib/workshop-schema";
import { cn, errorMessage, oauthErrorMessage } from "@site/src/lib/utils";

import { CommentsSection } from "./DetailComments";
import { CodeBlock, DeleteConfirmButton, DetailSkeleton, ScreenshotGallery } from "./DetailSections";
import { formatRelativeTime } from "./format";
import { downloadSubmissionJson, voteDelta } from "./workshop-utils";

const typeLabels: Record<SubmissionType, string> = { customCss: "CSS", customWidget: "Widget" };
const typeDotColors: Record<SubmissionType, string> = { customCss: "bg-blue-500", customWidget: "bg-yellow-500" };
const contentLanguages: Record<SubmissionType, string> = { customCss: "css", customWidget: "json" };
const copyState = [
  { Icon: IconCopy, label: "Copy", iconClass: "" },
  { Icon: IconCheck, label: "Copied!", iconClass: "text-green-500" },
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
  const [reports, setReports] = useState<Array<{ id: string; category: string; explanation: string }>>([]);
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
        const [listing, record, reportRows] = await Promise.all([
          pb.collection("workshop_listings").getOne<WorkshopSubmission>(submissionId),
          pb.collection("submissions").getOne<WorkshopSubmission>(submissionId),
          pb.collection("reports").getFullList<{ id: string; category: string; explanation: string }>({
            filter: pb.filter("submission = {:id} && status = 'open'", { id: submissionId }),
            sort: "-created",
          }),
        ]);
        if (cancelled) return;
        setSubmission({ ...listing, ...record, content: record.content });
        setReports(reportRows);

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
  }, [pb, submissionId]);

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
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!submission) return;
    const validation = validateSubmissionContent(submission.type, editContent);
    if (!validation.success) {
      setError(validation.error);
      return;
    }
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
      setError(errorMessage(caught, "Failed to update submission"));
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
  const { Icon: CopyIcon, label: copyLabel, iconClass: copyIconClass } = copyState[Number(copied)];

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
            {submission.reportCount > 0 && <Badge variant="destructive">Reported</Badge>}
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
            onClick={() => void handleVote(1)}
            aria-label="Upvote"
            className={cn(
              "flex items-center justify-center rounded-[5px] p-1.5 transition-colors hover:bg-accent",
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
            onClick={() => void handleVote(-1)}
            aria-label="Downvote"
            className={cn(
              "flex items-center justify-center rounded-[5px] p-1.5 transition-colors hover:bg-accent",
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Changelog</p>
          <p className="mt-1 text-sm">{submission.changelog}</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">
            The community has reported this submission {reports.length} time{reports.length === 1 ? "" : "s"}.
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {reports.map((report) => (
              <li key={report.id}>
                <strong>{report.category}:</strong> {report.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
          {copyFailed ? (
            <>
              <IconX size={14} className="text-destructive" /> Copy failed
            </>
          ) : (
            <>
              <CopyIcon size={14} className={copyIconClass} /> {copyLabel}
            </>
          )}
        </Button>
        {submission.type === "customWidget" && (
          <Button variant="outline" size="sm" onClick={() => downloadSubmissionJson(submission)}>
            <IconDownload size={14} /> Download
          </Button>
        )}
        {(user?.id === submission.author || user?.isAdmin === true) && (
          <Button variant="outline" size="sm" onClick={() => void handleOutdated()}>
            {submission.outdated ? "Mark current" : "Mark outdated"}
          </Button>
        )}
        {user?.id === submission.author && (
          <Button variant="outline" size="sm" onClick={openEdit}>
            Edit submission
          </Button>
        )}
        {(user?.id === submission.author || user?.isAdmin === true) && <DeleteConfirmButton onConfirm={handleDelete} />}
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit submission</DialogTitle>
            <DialogDescription>Saving creates a new revision and keeps the same Workshop URL.</DialogDescription>
          </DialogHeader>
          <label htmlFor="workshop-edit-title" className="grid gap-1.5 text-sm">
            Title
            <Input id="workshop-edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          </label>
          <label htmlFor="workshop-edit-description" className="grid gap-1.5 text-sm">
            Description
            <Textarea
              id="workshop-edit-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
            />
          </label>
          <label htmlFor="workshop-edit-changelog" className="grid gap-1.5 text-sm">
            Changelog
            <Textarea
              id="workshop-edit-changelog"
              value={editChangelog}
              onChange={(event) => setEditChangelog(event.target.value)}
              placeholder="What changed?"
            />
          </label>
          <label htmlFor="workshop-edit-content" className="grid gap-1.5 text-sm">
            Content
            <Textarea
              id="workshop-edit-content"
              className="font-mono text-xs"
              rows={14}
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={editTitle.trim().length < 3 || !editContent.trim()} onClick={() => void handleEdit()}>
              Save revision
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
          {() => <MarketplaceDetail workshopUrl={configuredWorkshopUrl || window.location.origin} />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
