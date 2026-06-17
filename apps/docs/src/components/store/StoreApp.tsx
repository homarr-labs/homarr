import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowBigDown,
  IconArrowBigUp,
  IconBrandCss3,
  IconBrandGithub,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDownload,
  IconFlag,
  IconLogout,
  IconPackage,
  IconPlus,
  IconPuzzle,
  IconSearch,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";

import { getSubmissionFileUrl, type StoreSubmission } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/store-schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SubmitForm } from "./SubmitForm";
import type { SortKey, TypeFilter } from "./useStore";
import { useStore } from "./useStore";

const typeIcons: Record<SubmissionType, React.ComponentType<{ size: number }>> = {
  css: IconBrandCss3,
  widget: IconPuzzle,
};
const typeBadgeVariants: Record<SubmissionType, "secondary" | "default"> = { css: "secondary", widget: "default" };
const filterActiveClass = "bg-background text-foreground shadow-sm";
const filterInactiveClass = "text-muted-foreground hover:text-foreground";
const copyState = [
  { Icon: IconCopy, label: "Copy", iconClass: "" },
  { Icon: IconCheck, label: "Copied!", iconClass: "text-green-500" },
] as const;
const emptyState = {
  none: { title: "No submissions yet", hint: "Be the first to share something." },
  filtered: { title: "No matching results", hint: "Try adjusting your filters or search." },
} as const;

const typeFilters: { value: TypeFilter; label: string; Icon?: React.ComponentType<{ size: number }> }[] = [
  { value: "all", label: "All" },
  { value: "widget", label: "Widgets", Icon: IconPuzzle },
  { value: "css", label: "CSS", Icon: IconBrandCss3 },
  { value: "yours", label: "Yours", Icon: IconUser },
];
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "top", label: "Top rated" },
  { value: "new", label: "Newest" },
];


const relativeTime = (date: string) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const downloadJson = (s: StoreSubmission) => {
  const url = URL.createObjectURL(new Blob([s.content], { type: "application/json" }));
  Object.assign(document.createElement("a"), {
    href: url,
    download: `${s.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`,
  }).click();
  URL.revokeObjectURL(url);
};

export const StoreApp = ({ storeUrl }: { storeUrl: string }) => {
  const store = useStore(storeUrl);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("top");
  const [search, setSearch] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);

  // Stable sort order: only re-sort when filter/sort/search or submission set changes (not vote counts)
  const submissionIds = useMemo(() => store.submissions.map((s) => s.id).join(","), [store.submissions]);
  const sortedIds = useMemo(() => {
    const q = search.toLowerCase();
    return store.submissions
      .filter((item) => {
        if (typeFilter === "yours") return item.author === store.user?.id;
        return typeFilter === "all" || item.type === typeFilter;
      })
      .filter((item) => !q || item.title.toLowerCase().includes(q))
      .toSorted(store.sorters[sort])
      .map((s) => s.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on submissionIds string, not the array
  }, [submissionIds, store.sorters, typeFilter, sort, search, store.user?.id]);

  const visible = useMemo(() => {
    const byId = new Map(store.submissions.map((s) => [s.id, s]));
    return sortedIds.map((id) => byId.get(id)).filter(Boolean) as StoreSubmission[];
  }, [store.submissions, sortedIds]);

  const empty = emptyState[store.submissions.length === 0 ? "none" : "filtered"];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Community custom widgets and CSS themes for Homarr.</p>
        </div>
        <div className="flex items-center gap-2">
          {store.user ? (
            <>
              <Button onClick={() => setShowSubmit(true)}>
                <IconPlus size={14} /> Share yours
              </Button>
              <Button variant="ghost" size="sm" onClick={store.logout}>
                <IconLogout size={14} /> {store.user?.name || store.user?.username || "Account"}
              </Button>
            </>
          ) : (
            <Button onClick={() => void store.login()}>
              <IconBrandGithub size={14} /> Sign in with GitHub to vote and submit yours
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-muted p-0.5">
            {typeFilters.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  typeFilter === opt.value ? filterActiveClass : filterInactiveClass,
                )}
              >
                {opt.Icon && <opt.Icon size={12} />}
                {opt.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Sort order"
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none dark:bg-input/30"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-7 w-48 rounded-md border border-input bg-transparent pl-8 text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {store.error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {store.error}
        </div>
      )}

      {store.loading && (
        <div className="columns-1 gap-4 lg:columns-2 xl:columns-3 2xl:columns-4 [&>*]:mb-4">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} hasImage={i % 3 === 0} />)}
        </div>
      )}

      {!store.loading && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16">
          <IconPackage size={28} stroke={1.5} className="text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">{empty.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{empty.hint}</p>
          </div>
          {store.user && store.submissions.length === 0 && (
            <Button size="sm" onClick={() => setShowSubmit(true)}>
              <IconPlus size={14} /> Create submission
            </Button>
          )}
        </div>
      )}

      <div className="columns-1 gap-4 lg:columns-2 xl:columns-3 [&>*]:mb-4">
        {visible.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            pb={store.pb}
            userVote={store.votes[submission.id]?.value}
            currentUserId={store.user?.id}
            onVote={store.vote}
            onReport={store.report}
            onDelete={store.deleteSubmission}
          />
        ))}
      </div>

      {showSubmit && (
        <SubmitForm
          onClose={() => setShowSubmit(false)}
          onSubmit={async (input) => {
            if (await store.submit(input)) setShowSubmit(false);
          }}
        />
      )}
    </div>
  );
};

interface SubmissionCardProps {
  submission: StoreSubmission;
  pb: ReturnType<typeof useStore>["pb"];
  userVote?: 1 | -1;
  currentUserId?: string;
  onVote: (submissionId: string, value: 1 | -1) => void;
  onReport: (submissionId: string, reason: string) => void;
  onDelete: (submissionId: string) => Promise<boolean>;
}

const SubmissionCard = ({
  submission,
  pb,
  userVote,
  currentUserId,
  onVote,
  onReport,
  onDelete,
}: SubmissionCardProps) => {
  const isOwner = currentUserId === submission.author;
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const score = submission.upvotes - submission.downvotes;
  const { Icon: CopyIcon, label: copyLabel, iconClass: copyIconClass } = copyState[Number(copied)];
  const screenshotUrls = useMemo(
    () => submission.screenshots?.map((f) => getSubmissionFileUrl(pb.baseURL, submission.id, f)) ?? [],
    [submission, pb],
  );

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const [copyFailed, setCopyFailed] = useState(false);
  const handleCopy = async () => {
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

  const handleReport = () => {
    const reason = window.prompt("Why are you reporting this submission?");
    if (reason && reason.trim().length >= 3) void onReport(submission.id, reason.trim());
  };

  const TypeIcon = typeIcons[submission.type];

  return (
    <Card className="transition-transform duration-150 hover:scale-[1.02]">
      <a href={`/marketplace/${submission.id}/`} className="block">
        {screenshotUrls.length > 0 && <ScreenshotGallery urls={screenshotUrls} title={submission.title} />}
      </a>

      <CardHeader>
        <div className="flex items-center gap-2">
          <a href={`/marketplace/${submission.id}/`} className="min-w-0 truncate hover:underline">
            <CardTitle className="truncate">{submission.title}</CardTitle>
          </a>
          <Badge variant={typeBadgeVariants[submission.type]} className="shrink-0 px-1.5">
            <TypeIcon size={12} />
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {submission.authorName} · v{submission.version} · {relativeTime(submission.created)}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-px rounded-md border border-border bg-muted/40 p-px">
            <button
              onClick={() => void onVote(submission.id, 1)}
              aria-label="Upvote"
              className={cn(
                "flex items-center justify-center rounded-[5px] p-1 transition-colors hover:bg-accent",
                userVote === 1 && "bg-primary/15 text-primary",
              )}
            >
              <IconArrowBigUp size={14} />
            </button>
            <span
              className={cn(
                "min-w-5 text-center text-xs font-semibold tabular-nums",
                score > 0 && "text-primary",
                score < 0 && "text-destructive",
              )}
            >
              {score}
            </span>
            <button
              onClick={() => void onVote(submission.id, -1)}
              aria-label="Downvote"
              className={cn(
                "flex items-center justify-center rounded-[5px] p-1 transition-colors hover:bg-accent",
                userVote === -1 && "bg-destructive/15 text-destructive",
              )}
            >
              <IconArrowBigDown size={14} />
            </button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        {submission.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{submission.description}</p>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-0 p-0">
        <div className="flex w-full flex-wrap items-center gap-0.5 px-2 py-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => void handleCopy()}
            className="text-muted-foreground hover:text-foreground"
          >
            {copyFailed ? (
              <>
                <IconX size={12} className="text-destructive" /> Failed
              </>
            ) : (
              <>
                <CopyIcon size={12} className={copyIconClass} /> {copyLabel}
              </>
            )}
          </Button>
          {submission.type === "widget" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => downloadJson(submission)}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconDownload size={12} /> Download
            </Button>
          )}
          <div className="ml-auto flex items-center gap-px">
            {isOwner && (
              <button
                className="flex items-center justify-center rounded p-1 text-muted-foreground/40 transition-colors hover:text-destructive"
                onClick={() => {
                  if (window.confirm("Delete this submission? This cannot be undone.")) void onDelete(submission.id);
                }}
                aria-label="Delete"
              >
                <IconTrash size={11} />
              </button>
            )}
            <button
              className="flex items-center justify-center rounded p-1 text-muted-foreground/40 transition-colors hover:text-destructive"
              onClick={handleReport}
              aria-label="Report"
            >
              <IconFlag size={11} />
            </button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const SkeletonCard = ({ hasImage }: { hasImage: boolean }) => (
  <Card>
    {hasImage && <div className="aspect-video animate-pulse bg-muted" />}
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
    </CardHeader>
    <CardContent>
      <div className="space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </CardContent>
    <CardFooter className="p-0">
      <div className="flex w-full gap-2 px-2 py-2">
        <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
      </div>
    </CardFooter>
  </Card>
);

const ScreenshotGallery = ({ urls, title }: { urls: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);
  const dotClass = ["bg-white/40", "bg-white"];

  return (
    <div className="group/gallery relative">
      <div className="aspect-video overflow-hidden bg-muted">
        <img
          className="h-full w-full object-cover"
          src={urls[idx]}
          alt={`${title} screenshot ${idx + 1}`}
          loading="lazy"
        />
      </div>
      {urls.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-0 shadow transition-opacity group-hover/gallery:opacity-100"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Previous screenshot"
          >
            <IconChevronLeft size={14} />
          </button>
          <button
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-0 shadow transition-opacity group-hover/gallery:opacity-100"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
            aria-label="Next screenshot"
          >
            <IconChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/50 px-2 py-1">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Screenshot ${i + 1}`}
                className={cn("size-1.5 rounded-full transition-all", dotClass[Number(i === idx)])}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

