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

import type { StoreSubmission, StoreVote } from "@site/src/lib/pocketbase";
import { getPocketBase, getSubmissionFileUrl } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/store-schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, errorMessage } from "@site/src/lib/utils";

import { CommentsSection } from "./DetailComments";
import { CodeBlock, DeleteConfirmButton, DetailSkeleton, ScreenshotGallery } from "./DetailSections";
import { formatRelativeTime } from "./format";
import { downloadSubmissionJson, voteDelta } from "./store-utils";

const typeLabels: Record<SubmissionType, string> = { css: "CSS", widget: "Widget" };
const typeDotColors: Record<SubmissionType, string> = { css: "bg-blue-500", widget: "bg-yellow-500" };
const contentLanguages: Record<SubmissionType, string> = { css: "css", widget: "json" };
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

const MarketplaceDetail = ({ storeUrl }: { storeUrl: string }) => {
  const location = useLocation();
  const submissionId = parseSubmissionId(location.pathname);
  const pb = useMemo(() => getPocketBase(storeUrl), [storeUrl]);

  const [submission, setSubmission] = useState<StoreSubmission | null>(null);
  const [userVote, setUserVote] = useState<StoreVote | undefined>();
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const copyFailedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const voting = useRef(false);

  const requireUserId = useCallback(
    async (action: string) => {
      if (!pb.authStore.isValid) {
        try {
          await pb.collection("users").authWithOAuth2({ provider: "github" });
        } catch (caught) {
          setError(errorMessage(caught, "Sign in failed"));
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
        const record = await pb.collection("marketplace").getOne<StoreSubmission>(submissionId);
        if (cancelled) return;
        setSubmission(record);

        if (pb.authStore.isValid && pb.authStore.record) {
          const votes = await pb.collection("votes").getFullList<StoreVote>({
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
        : ({ ...(prev ?? { id: "", submission: submission.id, user: userId }), value } as StoreVote),
    );
    setSubmission((s) => (s ? { ...s, upvotes: s.upvotes + upD, downvotes: s.downvotes + downD } : s));

    try {
      if (!prev) {
        const created = await pb
          .collection("votes")
          .create<StoreVote>({ submission: submission.id, value, user: userId });
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {submission.authorName} · v{submission.version} · {formatRelativeTime(submission.created)}
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
        {submission.type === "widget" && (
          <Button variant="outline" size="sm" onClick={() => downloadSubmissionJson(submission)}>
            <IconDownload size={14} /> Download
          </Button>
        )}
        {user?.id === submission.author && <DeleteConfirmButton onConfirm={handleDelete} />}
      </div>

      <div className="mt-6">
        <CodeBlock content={submission.content} language={contentLanguages[submission.type]} />
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <CommentsSection
          submissionId={submission.id}
          pb={pb}
          currentUserId={user?.id}
          onRequireAuth={requireUserId}
          onError={setError}
        />
      </div>
    </div>
  );
};

export default function MarketplaceDetailPage() {
  const { siteConfig } = useDocusaurusContext();
  const storeUrl = (siteConfig.customFields?.storeUrl as string | undefined) ?? "http://localhost:8090";

  return (
    <Layout title="Workshop" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<DetailSkeleton />}>{() => <MarketplaceDetail storeUrl={storeUrl} />}</BrowserOnly>
      </main>
    </Layout>
  );
}
