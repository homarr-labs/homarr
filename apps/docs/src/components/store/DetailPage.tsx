import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useColorMode } from "@docusaurus/theme-common";
import Layout from "@theme/Layout";
import {
  IconArrowBigDown,
  IconArrowBigUp,
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDownload,
  IconEdit,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Highlight, themes } from "prism-react-renderer";
import type { ClientResponseError } from "pocketbase";

import type { StoreComment, StoreSubmission, StoreVote } from "@site/src/lib/pocketbase";
import { getPocketBase, getSubmissionFileUrl } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/store-schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, errorMessage } from "@/lib/utils";

const typeLabels: Record<SubmissionType, string> = { css: "CSS", widget: "Widget" };
const typeDotColors: Record<SubmissionType, string> = { css: "bg-blue-500", widget: "bg-yellow-500" };
const contentLanguages: Record<SubmissionType, string> = { css: "css", widget: "json" };
const prismThemes = { light: themes.github, dark: themes.dracula } as const;
const copyState = [
  { Icon: IconCopy, label: "Copy", iconClass: "" },
  { Icon: IconCheck, label: "Copied!", iconClass: "text-green-500" },
] as const;
const scoreClassBySign = { positive: "text-foreground", negative: "text-destructive", neutral: "" } as const;
const dotClass = ["bg-white/40", "bg-white"];

const commentAuthorName = (c: StoreComment) => c.expand?.author?.name || c.expand?.author?.username || "unknown";

const relativeTime = (date: string) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

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

const downloadJson = (s: StoreSubmission) => {
  const url = URL.createObjectURL(new Blob([s.content], { type: "application/json" }));
  Object.assign(document.createElement("a"), {
    href: url,
    download: `${s.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`,
  }).click();
  URL.revokeObjectURL(url);
};

const voteDelta = (prev: 1 | -1 | undefined, next: 1 | -1): [up: number, down: number] => {
  if (!prev) return next === 1 ? [1, 0] : [0, 1];
  if (prev === next) return next === 1 ? [-1, 0] : [0, -1];
  return next === 1 ? [1, -1] : [-1, 1];
};

const isNotFound = (caught: unknown) =>
  typeof caught === "object" && caught !== null && "status" in caught && (caught as ClientResponseError).status === 404;

const DetailSkeleton = () => (
  <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse space-y-6">
    <div className="h-4 w-24 rounded bg-muted" />
    <div className="aspect-video w-full rounded-lg bg-muted" />
    <div className="space-y-2">
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
    </div>
    <div className="h-24 rounded-lg bg-muted" />
    <div className="h-48 rounded-lg bg-muted" />
  </div>
);

const ScreenshotGallery = ({ urls, title }: { urls: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);

  return (
    <div className="group/gallery relative w-full">
      <div className="aspect-video overflow-hidden rounded-lg bg-muted">
        <img className="h-full w-full object-cover" src={urls[idx]} alt={`${title} screenshot ${idx + 1}`} />
      </div>
      {urls.length > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Previous screenshot"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
            aria-label="Next screenshot"
          >
            <IconChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Screenshot ${i + 1}`}
                className={cn("size-2 rounded-full transition-all", dotClass[Number(i === idx)])}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const colorModeKeys = { dark: "dark", light: "light" } as const;

const CodeBlock = ({ content, language }: { content: string; language: string }) => {
  const { colorMode } = useColorMode();
  const theme = prismThemes[colorModeKeys[colorMode as keyof typeof colorModeKeys] ?? "light"];

  return (
    <Highlight theme={theme} code={content} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn(className, "overflow-auto rounded-lg border border-border p-4 text-sm leading-relaxed")}
          style={style}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};

const CommentsSection = ({
  submissionId,
  pb,
  currentUserId,
  onRequireAuth,
  onError,
}: {
  submissionId: string;
  pb: ReturnType<typeof getPocketBase>;
  currentUserId?: string;
  onRequireAuth: (action: string) => Promise<string | null>;
  onError: (message: string) => void;
}) => {
  const [rows, setRows] = useState<StoreComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    pb.collection("comments")
      .getFullList<StoreComment>({
        filter: pb.filter("submission = {:id}", { id: submissionId }),
        sort: "-created",
        expand: "author",
      })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pb, submissionId]);

  const handleAdd = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    const userId = await onRequireAuth("comment");
    if (!userId) return;
    try {
      const created = await pb
        .collection("comments")
        .create<StoreComment>({ submission: submissionId, content: trimmed, author: userId }, { expand: "author" });
      setRows((prev) => [created, ...prev]);
      setNewComment("");
    } catch (caught) {
      onError(errorMessage(caught, "Failed to post comment"));
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      const updated = await pb
        .collection("comments")
        .update<StoreComment>(id, { content: trimmed }, { expand: "author" });
      setRows((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (caught) {
      onError(errorMessage(caught, "Failed to update comment"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection("comments").delete(id);
      setRows((prev) => prev.filter((c) => c.id !== id));
    } catch (caught) {
      onError(errorMessage(caught, "Failed to delete comment"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Comments</h2>
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Write a comment…"
          aria-label="Write a comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
        />
        <Button size="icon-sm" onClick={() => void handleAdd()} aria-label="Post comment">
          <IconSend size={14} />
        </Button>
      </div>

      {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading comments…</p>}
      {!loading && fetchError && <p className="py-4 text-center text-sm text-destructive">Failed to load comments</p>}
      {!loading && !fetchError && rows.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>
      )}

      <div className="space-y-2">
        {rows.map((comment) => {
          const isOwner = currentUserId === comment.author;
          const isEditing = editingId === comment.id;
          return (
            <div key={comment.id} className="rounded-lg bg-muted/30 px-3 py-2 dark:bg-input/20">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{commentAuthorName(comment)}</span>
                <span className="text-muted-foreground/60">{relativeTime(comment.created)}</span>
                {isOwner && !isEditing && (
                  <div className="ml-auto flex gap-0.5">
                    <button
                      className="rounded p-1 hover:bg-accent"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <IconEdit size={12} />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => void handleDelete(comment.id)}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="mt-2 flex items-center gap-1">
                  <Input
                    className="flex-1"
                    aria-label="Edit comment"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleUpdate(comment.id);
                    }}
                  />
                  <Button size="icon-sm" onClick={() => void handleUpdate(comment.id)}>
                    <IconCheck size={12} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                    <IconX size={12} />
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DeleteConfirmButton = ({ onConfirm }: { onConfirm: () => void }) => {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleClick = () => {
    if (!pending) {
      setPending(true);
      timer.current = setTimeout(() => setPending(false), 3000);
      return;
    }
    setPending(false);
    onConfirm();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        pending ? "border-destructive bg-destructive/10 text-destructive" : "text-destructive hover:bg-destructive/10",
      )}
      onClick={handleClick}
    >
      <IconTrash size={14} /> {pending ? "Confirm delete?" : "Delete"}
    </Button>
  );
};

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
        await pb.collection("votes").create({ submission: submission.id, value, user: userId });
        const votes = await pb.collection("votes").getFullList<StoreVote>({
          filter: pb.filter("user = {:uid} && submission = {:sid}", { uid: userId, sid: submission.id }),
        });
        setUserVote(votes[0]);
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
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
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
            {submission.authorName} · v{submission.version} · {relativeTime(submission.created)}
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
          <Button variant="outline" size="sm" onClick={() => downloadJson(submission)}>
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
