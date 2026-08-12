import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import {
  IconArrowBigDown,
  IconArrowBigUp,
  IconArrowLeft,
  IconBrandGithub,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconFlag,
  IconInfoCircle,
  IconKey,
  IconLoader2,
  IconPencil,
  IconRefresh,
  IconServer,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import type { ClientResponseError } from "pocketbase";
import { toast } from "sonner";

import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";
import { getWorkshopBackend } from "@site/src/lib/pocketbase";
import { getRuntimeWorkshopApiUrl } from "@site/src/lib/runtime-config";
import type { SubmissionType } from "@site/src/lib/workshop-schema";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import {
  githubAvatarUrl,
  githubProfileUrl,
  formatWorkshopContent,
  MAX_WORKSHOP_SCREENSHOTS,
  MAX_WORKSHOP_SCREENSHOT_BYTES,
  WORKSHOP_SCREENSHOT_MIME_TYPES,
} from "@homarr/workshop";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { CustomWidgetCodeExample, CustomWidgetCodeInput } from "../custom-widget-code";
import { validateSubmissionContent } from "@site/src/lib/workshop-schema";
import { cn, errorMessage, oauthErrorMessage } from "@site/src/lib/utils";

import { CommentsSection } from "./DetailComments";
import { CodeBlock, DeleteConfirmButton, DetailSkeleton, ScreenshotGallery } from "./DetailSections";
import { formatRelativeTime } from "./format";
import { ScreenshotEditor } from "./ScreenshotEditor";
import { WorkshopErrorBoundary } from "./WorkshopErrorBoundary";
import { downloadSubmissionJson, voteAndReconcile } from "./workshop-utils";

const typeLabels: Record<SubmissionType, string> = { customCss: "CSS", customWidget: "Widget" };
const typeSocialLabels: Record<SubmissionType, string> = { customCss: "Custom CSS", customWidget: "Custom widget" };
const typeDotColors: Record<SubmissionType, string> = { customCss: "bg-blue-500", customWidget: "bg-yellow-500" };
const contentLanguages: Record<SubmissionType, string> = { customCss: "css", customWidget: "json" };
const copyState = [
  { Icon: IconCopy, iconClass: "" },
  { Icon: IconCheck, iconClass: "text-green-500" },
] as const;

interface PendingScreenshot {
  id: string;
  file: File;
  previewUrl: string;
}

const parseSubmissionId = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last === "workshop") return null;
  return last;
};

const isNotFound = (caught: unknown) =>
  typeof caught === "object" && caught !== null && "status" in caught && (caught as ClientResponseError).status === 404;

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

const sourceHost = (baseUrl: string) => {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
};

const sourceAuthLabel = (auth: HomarrCustomWidgetV2["sources"][string]["auth"]) => {
  if (typeof auth === "string")
    return auth === "none" ? "No credentials" : auth === "basic" ? "Basic auth" : "Bearer token";
  return auth.type === "apiKeyHeader" ? `API key header · ${auth.name}` : `API key query · ${auth.name}`;
};

const sourceNeedsSecret = (auth: HomarrCustomWidgetV2["sources"][string]["auth"]) => auth !== "none";

const WidgetSafetySummary = ({ widget }: { widget: HomarrCustomWidgetV2 }) => {
  const sources = Object.entries(widget.sources);
  const requests = Object.values(widget.requests);
  const protectedSources = sources.filter(([, source]) => sourceNeedsSecret(source.auth));
  const queryCount = requests.filter((request) => request.kind === "query").length;
  const actionCount = requests.filter((request) => request.kind === "action").length;
  const credentialLabel =
    protectedSources.length === 0
      ? "None required"
      : protectedSources.length === 1
        ? sourceAuthLabel(protectedSources[0][1].auth)
        : `${protectedSources.length} credentials required`;

  return (
    <section
      aria-labelledby="workshop-mobile-safety-heading"
      className="mt-6 overflow-hidden rounded-lg border border-border bg-muted/20 xl:hidden"
    >
      <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <IconInfoCircle size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="workshop-mobile-safety-heading" className="text-sm font-semibold">
            Before you install
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Review its connections and credentials. Secrets are added in Homarr and never included in the download.
          </p>
        </div>
      </div>

      <dl className="grid text-sm sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.65fr)_auto] sm:divide-x sm:divide-border">
        <div className="min-w-0 px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <IconServer size={14} /> Connects to
          </dt>
          <dd className="mt-1.5 space-y-1.5">
            {sources.slice(0, 2).map(([id, source]) => (
              <span key={id} className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-mono text-xs font-medium">{sourceHost(source.baseUrl)}</span>
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {source.networkScope}
                </Badge>
              </span>
            ))}
            {sources.length > 2 && <span className="text-xs text-muted-foreground">+{sources.length - 2} more</span>}
          </dd>
        </div>

        <div className="border-t border-border px-4 py-3 sm:border-t-0">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <IconKey size={14} /> Credentials
          </dt>
          <dd className="mt-1.5 truncate font-medium">{credentialLabel}</dd>
        </div>

        <div className="border-t border-border px-4 py-3 sm:border-t-0">
          <dt className="text-xs font-medium text-muted-foreground">Capabilities</dt>
          <dd className="mt-1.5 whitespace-nowrap font-medium tabular-nums">
            {queryCount} {queryCount === 1 ? "query" : "queries"}
            {actionCount > 0 && ` · ${actionCount} ${actionCount === 1 ? "action" : "actions"}`}
          </dd>
        </div>
      </dl>
    </section>
  );
};

const MarketplaceDetail = ({ workshopUrl }: { workshopUrl: string }) => {
  const location = useLocation();
  const submissionId = parseSubmissionId(location.pathname);
  const backend = useMemo(() => getWorkshopBackend(workshopUrl), [workshopUrl]);

  const [submission, setSubmission] = useState<WorkshopSubmission | null>(null);
  const [userVote, setUserVote] = useState<WorkshopVote | undefined>();
  const [user, setUser] = useState(backend.currentUser);
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
  const [editExistingScreenshots, setEditExistingScreenshots] = useState<string[]>([]);
  const [editNewScreenshots, setEditNewScreenshots] = useState<PendingScreenshot[]>([]);
  const [editScreenshotError, setEditScreenshotError] = useState<string | null>(null);
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
  const editPreviewUrls = useRef(new Set<string>());
  const voting = useRef(false);

  const revokeEditPreviewUrls = useCallback(() => {
    editPreviewUrls.current.forEach(URL.revokeObjectURL);
    editPreviewUrls.current.clear();
  }, []);

  const resetEditScreenshotDraft = useCallback(() => {
    revokeEditPreviewUrls();
    setEditNewScreenshots([]);
    setEditScreenshotError(null);
  }, [revokeEditPreviewUrls]);

  const requireUserId = useCallback(
    async (action: string) => {
      if (!backend.currentUser) {
        try {
          await backend.signInWithGitHub();
        } catch (caught) {
          setError(oauthErrorMessage(caught));
          return null;
        }
      }
      const userId = backend.currentUser?.id;
      if (!userId) {
        setError(`Sign in to ${action}`);
        return null;
      }
      return userId;
    },
    [backend],
  );

  useEffect(() => {
    void backend.refreshAuth();
    return backend.subscribeToAuth(setUser);
  }, [backend]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (copyFailedTimer.current) clearTimeout(copyFailedTimer.current);
      revokeEditPreviewUrls();
    },
    [revokeEditPreviewUrls],
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
        const record = await backend.get(submissionId);
        if (cancelled) return;
        setSubmission(record);

        if (backend.currentUser) {
          const votes = await backend.listVotesForCurrentUser();
          if (!cancelled) setUserVote(votes.find((vote) => vote.submission === submissionId));
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
  }, [backend, submissionId, reloadKey]);

  const screenshotUrls = useMemo(
    () => submission?.screenshots?.map((file) => backend.fileUrl(submission.id, file)) ?? [],
    [submission, backend],
  );

  const widgetDefinition = useMemo<HomarrCustomWidgetV2 | null>(() => {
    if (submission?.type !== "customWidget") return null;
    const result = validateSubmissionContent("customWidget", submission.content);
    return result.success && typeof result.data === "object" ? result.data : null;
  }, [submission]);

  const handleVote = async (value: 1 | -1) => {
    if (!submission || voting.current) return;
    voting.current = true;

    if (!(await requireUserId("vote"))) {
      voting.current = false;
      return;
    }

    try {
      const reconciled = await voteAndReconcile(backend, submission.id, value);
      setSubmission(reconciled.submission);
      setUserVote(reconciled.votes.find((vote) => vote.submission === submission.id));
    } catch (caught) {
      setError(errorMessage(caught, "Failed to register your vote"));
    } finally {
      voting.current = false;
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    try {
      await backend.delete(submission.id);
      window.location.href = "/workshop/";
    } catch (caught) {
      setError(errorMessage(caught, "Failed to delete submission"));
    }
  };

  const handleOutdated = async () => {
    if (!submission) return;
    try {
      const updated = await backend.toggleOutdated(submission.id, !submission.outdated);
      setSubmission(updated);
      setError(null);
      toast.success(updated.outdated ? "Submission marked as outdated" : "Submission marked as current");
    } catch (caught) {
      setError(errorMessage(caught, "Failed to update submission status"));
    }
  };

  const addEditScreenshots = (files: FileList | File[]) => {
    const available = MAX_WORKSHOP_SCREENSHOTS - editExistingScreenshots.length - editNewScreenshots.length;
    const selected = Array.from(files);
    const supported = selected.filter(
      (file) =>
        WORKSHOP_SCREENSHOT_MIME_TYPES.includes(file.type as (typeof WORKSHOP_SCREENSHOT_MIME_TYPES)[number]) &&
        file.size <= MAX_WORKSHOP_SCREENSHOT_BYTES,
    );
    const accepted = supported.slice(0, Math.max(0, available));

    if (supported.length !== selected.length)
      setEditScreenshotError("Use PNG, JPG, or WebP images no larger than 5 MB each.");
    else if (accepted.length !== selected.length)
      setEditScreenshotError(`A submission can have up to ${MAX_WORKSHOP_SCREENSHOTS} screenshots.`);
    else setEditScreenshotError(null);

    if (accepted.length === 0) return;
    const additions = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      editPreviewUrls.current.add(previewUrl);
      return { id: `new:${previewUrl}`, file, previewUrl };
    });
    setEditNewScreenshots((current) => [...current, ...additions]);
  };

  const removeEditScreenshot = (id: string) => {
    if (id.startsWith("saved:")) {
      const filename = id.slice("saved:".length);
      setEditExistingScreenshots((current) => current.filter((item) => item !== filename));
    } else {
      setEditNewScreenshots((current) => {
        const removed = current.find((item) => item.id === id);
        if (removed) {
          URL.revokeObjectURL(removed.previewUrl);
          editPreviewUrls.current.delete(removed.previewUrl);
        }
        return current.filter((item) => item.id !== id);
      });
    }
    setEditScreenshotError(null);
  };

  const closeEdit = () => {
    setEditOpen(false);
    resetEditScreenshotDraft();
  };

  const openEdit = () => {
    if (!submission) return;
    resetEditScreenshotDraft();
    setEditTitle(submission.title);
    setEditDescription(submission.description);
    setEditChangelog("");
    setEditContent(submission.content);
    setEditExistingScreenshots(submission.screenshots);
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
      const updated = await backend.update(
        submission.id,
        {
          type: submission.type,
          title: editTitle.trim(),
          description: editDescription.trim(),
          content: editContent,
          changelog: editChangelog.trim(),
          outdated: submission.outdated,
        },
        {
          additions: editNewScreenshots.map((item) => item.file),
          removals: submission.screenshots.filter((filename) => !editExistingScreenshots.includes(filename)),
        },
      );
      setSubmission(updated);
      closeEdit();
      setError(null);
      toast.success("Revision published", { description: "Your changes are now live in the Workshop." });
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
      await backend.report(
        submission.id,
        reportCategory as "outdated" | "malicious" | "spam" | "copyright" | "inappropriate" | "other",
        reportExplanation,
      );
      setReportOpen(false);
      setReportExplanation("");
      setError(null);
      toast.success("Report submitted", { description: "A Workshop moderator can now review it." });
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

  const canManage = user?.id === submission.author || user?.isAdmin === true;
  const canEdit = user?.id === submission.author;
  const signedInAuthor = user?.id === submission.author ? user : null;
  const authorHandle = signedInAuthor?.name || submission.authorName;
  const authorName = authorHandle || "Community member";
  const authorAvatarUrl = githubAvatarUrl(authorHandle);
  const authorGithubProfileUrl = githubProfileUrl(authorHandle);
  const sources = widgetDefinition ? Object.entries(widgetDefinition.sources) : [];
  const requests = widgetDefinition ? Object.entries(widgetDefinition.requests) : [];
  const options = widgetDefinition ? Object.entries(widgetDefinition.options) : [];
  const protectedSources = sources.filter(([, source]) => sourceNeedsSecret(source.auth));
  const displayedContent = formatWorkshopContent(submission.type, submission.content);
  const socialTitle = `${submission.title} · Homarr Workshop`;
  const socialDescription = `${typeSocialLabels[submission.type]} for Homarr. ${submission.description}`.trim();
  const socialUrl = `${window.location.origin}${window.location.pathname}`;
  const socialImage = screenshotUrls[0] ?? `${window.location.origin}/img/logo.png`;

  return (
    <div className="mx-auto max-w-[90rem] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Head>
        <title>{socialTitle}</title>
        <meta name="description" content={socialDescription} />
        <link rel="canonical" href={socialUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Homarr Workshop" />
        <meta property="og:title" content={socialTitle} />
        <meta property="og:description" content={socialDescription} />
        <meta property="og:url" content={socialUrl} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:image:alt" content={`${submission.title} preview`} />
        <meta property="article:section" content={typeSocialLabels[submission.type]} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={socialTitle} />
        <meta name="twitter:description" content={socialDescription} />
        <meta name="twitter:image" content={socialImage} />
        <meta name="twitter:image:alt" content={`${submission.title} preview`} />
      </Head>
      <Toaster position="bottom-right" richColors />
      <Link
        to="/workshop"
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <IconArrowLeft size={14} /> Back to Workshop
      </Link>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <IconInfoCircle />
          <AlertTitle>Workshop action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
                    {typeLabels[submission.type]}
                  </Badge>
                  {submission.outdated && <Badge variant="destructive">Outdated</Badge>}
                  <span className="text-xs text-muted-foreground">Revision {submission.revision}</span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{submission.title}</h1>
                {submission.description && (
                  <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                    {submission.description}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-3">
                  <a
                    href={authorGithubProfileUrl || undefined}
                    target={authorGithubProfileUrl ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <Avatar className="size-10 bg-primary/10 ring-1 ring-primary/20">
                      {authorAvatarUrl && <AvatarImage src={authorAvatarUrl} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">
                        {avatarFallback(authorName)}
                      </AvatarFallback>
                    </Avatar>
                  </a>
                  <div className="min-w-0">
                    <a
                      href={authorGithubProfileUrl || undefined}
                      target={authorGithubProfileUrl ? "_blank" : undefined}
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
                    >
                      {authorName}
                      {authorGithubProfileUrl && <IconBrandGithub size={14} />}
                    </a>
                    <p className="text-xs text-muted-foreground">Published {formatRelativeTime(submission.created)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-px rounded-lg border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => void handleVote(1)}
                  aria-label="Upvote"
                  aria-pressed={userVote?.value === 1}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                    userVote?.value === 1 && "bg-primary/15 text-primary",
                  )}
                >
                  <IconArrowBigUp size={18} />
                </button>
                <span
                  aria-live="polite"
                  className="min-w-7 text-center text-sm font-semibold tabular-nums text-foreground"
                >
                  {score}
                </span>
                <button
                  type="button"
                  onClick={() => void handleVote(-1)}
                  aria-label="Downvote"
                  aria-pressed={userVote?.value === -1}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                    userVote?.value === -1 && "bg-primary/15 text-primary",
                  )}
                >
                  <IconArrowBigDown size={18} />
                </button>
              </div>
            </div>

            {widgetDefinition && <WidgetSafetySummary widget={widgetDefinition} />}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {submission.type === "customWidget" && (
                <Button size="sm" className="min-h-11 sm:min-h-8" onClick={() => downloadSubmissionJson(submission)}>
                  <IconDownload size={14} /> Download widget JSON
                </Button>
              )}
              <Button
                variant={submission.type === "customCss" ? "default" : "outline"}
                size="sm"
                className="min-h-11 sm:min-h-8"
                aria-live="polite"
                onClick={() => void handleCopy()}
              >
                {copyFailed ? (
                  <>
                    <IconX size={14} className="text-destructive" /> Copy failed
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} className={copyIconClass} />
                    {copied ? "Copied" : submission.type === "customCss" ? "Copy CSS" : "Copy JSON"}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 text-muted-foreground sm:min-h-8"
                onClick={() => setReportOpen(true)}
              >
                <IconFlag size={14} /> Report
              </Button>
            </div>
          </header>

          {screenshotUrls.length > 0 && (
            <section className="mt-8">
              <ScreenshotGallery urls={screenshotUrls} title={submission.title} />
            </section>
          )}

          {submission.changelog && (
            <section className="mt-8 border-l-2 border-primary/50 pl-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What changed</p>
              <p className="mt-1 text-sm leading-relaxed">{submission.changelog}</p>
            </section>
          )}

          <section className="mt-8" aria-labelledby="workshop-source-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="workshop-source-heading" className="text-lg font-semibold">
                  Source
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Review exactly what will be installed.</p>
              </div>
            </div>
            {submission.type === "customWidget" ? (
              <CustomWidgetCodeExample
                id={`workshop-${submission.id}`}
                label="widget.json"
                code={displayedContent}
                language="json"
                height="min(58vh, 640px)"
              />
            ) : (
              <CodeBlock content={displayedContent} language={contentLanguages[submission.type]} />
            )}
          </section>

          <div className="mt-12 border-t border-border pt-9">
            <CommentsSection
              submissionId={submission.id}
              backend={backend}
              currentUser={user}
              onRequireAuth={requireUserId}
            />
          </div>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconDownload size={17} />
              </div>
              <div>
                <h2 className="font-semibold">Install in Homarr</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {submission.type === "customWidget"
                    ? "Download the JSON, then import it from Manage → Custom Widgets."
                    : "Copy the CSS and paste it into your board's Custom CSS settings."}
                </p>
              </div>
            </div>
            <Link
              to="/docs/workshop/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Installation guide <IconExternalLink size={13} />
            </Link>
          </section>

          {widgetDefinition && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Widget details</h2>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconServer size={14} /> API sources
                  </div>
                  <div className="space-y-2.5">
                    {sources.map(([id, source]) => (
                      <div key={id} className="min-w-0">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{source.name || id}</span>
                          <Badge variant="secondary" className="shrink-0">
                            {source.networkScope}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{sourceHost(source.baseUrl)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{sourceAuthLabel(source.auth)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconSettings size={14} /> Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {requests.filter(([, request]) => request.kind === "query").length} queries
                    </Badge>
                    <Badge variant="secondary">
                      {requests.filter(([, request]) => request.kind === "action").length} actions
                    </Badge>
                    <Badge variant="secondary">{options.length} options</Badge>
                  </div>
                  {requests.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {requests.slice(0, 6).map(([id, request]) => (
                        <div key={id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-muted-foreground">{id}</span>
                          <span className="shrink-0 font-mono font-medium">{request.method}</span>
                        </div>
                      ))}
                      {requests.length > 6 && (
                        <p className="text-xs text-muted-foreground">+{requests.length - 6} more</p>
                      )}
                    </div>
                  )}
                </div>

                {options.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <IconSettings size={14} /> Configurable options
                    </div>
                    <div className="space-y-2">
                      {options.slice(0, 6).map(([id, option]) => (
                        <div key={id} className="flex items-start justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate text-muted-foreground">{option.label}</span>
                          <span className="shrink-0 font-medium">{option.control}</span>
                        </div>
                      ))}
                      {options.length > 6 && (
                        <p className="text-xs text-muted-foreground">+{options.length - 6} more</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconKey size={14} /> Credentials
                  </div>
                  {protectedSources.length > 0 ? (
                    <>
                      <p className="text-sm">
                        {protectedSources.length} source{protectedSources.length === 1 ? " requires" : "s require"}{" "}
                        credentials.
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Secrets are entered after import and are never included in Workshop downloads.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No credentials required.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {canManage && (
            <section className="border-t border-border pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Manage submission
              </p>
              <div className="grid gap-1">
                {canEdit && (
                  <Button variant="ghost" size="sm" className="justify-start" onClick={openEdit}>
                    <IconPencil size={14} /> Edit submission
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => void handleOutdated()}>
                  <IconInfoCircle size={14} /> {submission.outdated ? "Mark current" : "Mark outdated"}
                </Button>
                <DeleteConfirmButton className="w-full justify-start" onConfirm={handleDelete} />
              </div>
            </section>
          )}
        </aside>
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
              Only Workshop moderators can review report details and reporter identities.
            </DialogDescription>
          </DialogHeader>
          {reportError && (
            <Alert variant="destructive">
              <IconFlag />
              <AlertTitle>Report was not submitted</AlertTitle>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          )}
          <label htmlFor="workshop-report-category" className="grid gap-1.5 text-sm">
            Category
            <Select value={reportCategory} onValueChange={(value) => setReportCategory(value as string)}>
              <SelectTrigger id="workshop-report-category" className="h-10 w-full">
                <SelectValue>{(value) => String(value).replace(/^./u, (letter) => letter.toUpperCase())}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="outdated">Outdated or no longer working</SelectItem>
                <SelectItem value="malicious">Malicious</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="copyright">Copyright</SelectItem>
                <SelectItem value="inappropriate">Inappropriate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
          if (editPending) return;
          if (open) setEditOpen(true);
          else closeEdit();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit submission</DialogTitle>
            <DialogDescription>Saving creates a new revision and keeps the same Workshop URL.</DialogDescription>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">
              <IconInfoCircle />
              <AlertTitle>Revision could not be saved</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{editError}</AlertDescription>
            </Alert>
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
          <div className="border-t border-border pt-5">
            <ScreenshotEditor
              items={[
                ...editExistingScreenshots.map((filename) => ({
                  id: `saved:${filename}`,
                  src: backend.fileUrl(submission.id, filename),
                  badge: "Current",
                })),
                ...editNewScreenshots.map((item) => ({
                  id: item.id,
                  src: item.previewUrl,
                  badge: "New",
                })),
              ]}
              onAdd={addEditScreenshots}
              onRemove={removeEditScreenshot}
              disabled={editPending}
              description="Keep, remove, or add images for this revision. Changes apply only when you save."
            />
            {editScreenshotError && <p className="mt-2 text-xs text-destructive">{editScreenshotError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={editPending}>
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

  useEffect(() => {
    document.documentElement.removeAttribute("data-workshop-detail-loading");
  }, []);

  return (
    <Layout title="Workshop" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<DetailSkeleton />}>
          {() => (
            <WorkshopErrorBoundary>
              <MarketplaceDetail workshopUrl={getRuntimeWorkshopApiUrl(configuredWorkshopUrl)} />
            </WorkshopErrorBoundary>
          )}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
