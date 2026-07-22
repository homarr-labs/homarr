import React, { useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconArrowBigDown,
  IconArrowBigUp,
  IconBrandCss3,
  IconBrandGithub,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconLogout,
  IconMessage,
  IconPackage,
  IconPlus,
  IconPuzzle,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import { getSubmissionFileUrl, type WorkshopSubmission } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/workshop-schema";

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
import { formatRelativeTime } from "./format";
import type { SortKey, TypeFilter } from "./useWorkshop";
import { useWorkshop } from "./useWorkshop";

const typeDotColors: Record<SubmissionType, string> = { customCss: "bg-blue-500", customWidget: "bg-yellow-500" };
const typeLabels: Record<SubmissionType, string> = { customCss: "CSS", customWidget: "Widget" };
const typeIcons: Record<SubmissionType, React.ComponentType<{ size: number; className?: string }>> = {
  customCss: IconBrandCss3,
  customWidget: IconPuzzle,
};
const typeBgColors: Record<SubmissionType, string> = { customCss: "bg-blue-500/5", customWidget: "bg-yellow-500/5" };
const filterActiveClass = "bg-background text-foreground shadow-sm";
const filterInactiveClass = "text-muted-foreground hover:text-foreground";
const emptyState = {
  none: { title: "No submissions yet", hint: "Be the first to share something." },
  filtered: { title: "No matching results", hint: "Try adjusting your filters or search." },
} as const;

const typeFilters: { value: TypeFilter; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "customWidget", label: "Widgets", dot: typeDotColors.customWidget },
  { value: "customCss", label: "CSS", dot: typeDotColors.customCss },
];
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "top", label: "Top rated" },
  { value: "new", label: "Newest" },
  { value: "recent", label: "Recently updated" },
  { value: "discussed", label: "Most discussed" },
];

const stopCardNavigation = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

export const WorkshopApp = ({ workshopUrl }: { workshopUrl: string }) => {
  const workshop = useWorkshop(workshopUrl);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("top");
  const [search, setSearch] = useState("");
  const [includeOutdated, setIncludeOutdated] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);

  // Stable sort order: only re-sort when filter/sort/search or submission set changes (not vote counts)
  const submissionIds = useMemo(() => workshop.submissions.map((s) => s.id).join(","), [workshop.submissions]);
  const sortedIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workshop.submissions
      .filter((item) => {
        if (typeFilter === "yours") return item.author === workshop.user?.id;
        return typeFilter === "all" || item.type === typeFilter;
      })
      .filter((item) => includeOutdated || !item.outdated)
      .filter(
        (item) =>
          !q || [item.title, item.description, item.authorName].some((value) => value?.toLowerCase().includes(q)),
      )
      .toSorted(workshop.sorters[sort])
      .map((s) => s.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on submissionIds string, not the array
  }, [submissionIds, workshop.sorters, typeFilter, sort, search, includeOutdated, workshop.user?.id]);

  const visible = useMemo(() => {
    const byId = new Map(workshop.submissions.map((s) => [s.id, s]));
    return sortedIds.map((id) => byId.get(id)).filter(Boolean) as WorkshopSubmission[];
  }, [workshop.submissions, sortedIds]);

  const empty = emptyState[workshop.submissions.length === 0 ? "none" : "filtered"];
  const initialLoadFailed = !workshop.loading && Boolean(workshop.error) && workshop.submissions.length === 0;
  const availableTypeFilters = workshop.user
    ? [...typeFilters, { value: "yours" as const, label: "Yours" }]
    : typeFilters;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="flex flex-col gap-5 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workshop</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Discover community-made widgets and CSS. Review the source, then import it into Homarr.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {workshop.user ? (
            <>
              <Button className="h-10 sm:h-8" onClick={() => setShowSubmit(true)}>
                <IconPlus size={14} /> Share yours
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 sm:h-7"
                onClick={() => {
                  setTypeFilter("all");
                  workshop.logout();
                }}
              >
                <IconLogout size={14} /> {workshop.user?.displayName || workshop.user?.username || "Account"}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Button className="h-10 sm:h-8" onClick={() => void workshop.login()}>
                <IconBrandGithub size={14} /> Sign in with GitHub
              </Button>
              <p className="text-xs text-muted-foreground">Vote, comment, report, and publish</p>
            </div>
          )}
        </div>
      </div>

      {workshop.submissions.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative order-first w-full sm:order-last sm:w-60">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9"
              placeholder="Search by title, description, or author"
              aria-label="Search submissions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <fieldset
              className={cn(
                "grid min-w-0 rounded-md border-0 bg-muted p-0.5 sm:flex",
                workshop.user ? "grid-cols-4" : "grid-cols-3",
              )}
              aria-label="Submission type"
            >
              {availableTypeFilters.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value)}
                  aria-pressed={typeFilter === opt.value}
                  className={cn(
                    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded px-3 text-sm font-medium transition-colors sm:min-h-8 sm:text-xs",
                    typeFilter === opt.value ? filterActiveClass : filterInactiveClass,
                  )}
                >
                  {opt.dot && <span className={cn("size-2 rounded-full", opt.dot)} />}
                  {opt.label}
                </button>
              ))}
            </fieldset>
            <div className="flex items-center gap-2">
              <select
                aria-label="Sort submissions"
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:flex-none sm:text-xs dark:bg-input/30"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIncludeOutdated((value) => !value)}
                aria-pressed={!includeOutdated}
                className={cn(
                  "h-10 shrink-0 rounded-md border border-input px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:text-xs",
                  includeOutdated ? "bg-transparent text-muted-foreground" : filterActiveClass,
                )}
              >
                {includeOutdated ? "Hide outdated" : "Show outdated"}
              </button>
            </div>
          </div>
        </div>
      )}

      {initialLoadFailed && (
        <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <IconAlertCircle size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Workshop listings could not be loaded</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Check the Workshop service and your connection, then try again.
            </p>
          </div>
          <Button variant="outline" onClick={() => void workshop.refresh()}>
            <IconRefresh size={15} /> Try loading again
          </Button>
        </div>
      )}

      {workshop.error && workshop.submissions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <span className="text-destructive">Some Workshop data could not be refreshed.</span>
          <Button variant="ghost" size="sm" onClick={() => void workshop.refresh()}>
            <IconRefresh size={14} /> Retry
          </Button>
        </div>
      )}

      {workshop.loading && workshop.submissions.length === 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} hasImage={i % 3 === 0} />
          ))}
        </div>
      )}

      {!workshop.loading && !workshop.error && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16">
          <IconPackage size={28} stroke={1.5} className="text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">{empty.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{empty.hint}</p>
          </div>
          {workshop.submissions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setSearch("");
                setIncludeOutdated(true);
              }}
            >
              Clear filters
            </Button>
          )}
          {workshop.user && workshop.submissions.length === 0 && (
            <Button size="sm" onClick={() => setShowSubmit(true)}>
              <IconPlus size={14} /> Create submission
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            pb={workshop.pb}
            userVote={workshop.votes[submission.id]?.value}
            onVote={workshop.vote}
          />
        ))}
      </div>

      {showSubmit && (
        <SubmitForm
          onClose={() => setShowSubmit(false)}
          onSubmit={async (input) => {
            if (await workshop.submit(input)) setShowSubmit(false);
          }}
        />
      )}
    </div>
  );
};

interface SubmissionCardProps {
  submission: WorkshopSubmission;
  pb: ReturnType<typeof useWorkshop>["pb"];
  userVote?: 1 | -1;
  onVote: (submissionId: string, value: 1 | -1) => void;
}

const SubmissionCard = ({ submission, pb, userVote, onVote }: SubmissionCardProps) => {
  const score = submission.upvotes - submission.downvotes;
  const screenshotUrls = useMemo(
    () => submission.screenshots?.map((f) => getSubmissionFileUrl(pb.baseURL, submission.id, f)) ?? [],
    [submission, pb],
  );

  const hasScreenshots = screenshotUrls.length > 0;
  const TypeIcon = typeIcons[submission.type];

  return (
    <Card className="relative flex h-full flex-col">
      <a href={`/workshop/${submission.id}/`} className="block">
        {hasScreenshots ? (
          <div className="relative">
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 z-10 gap-1.5 bg-background/80 px-2 backdrop-blur-sm"
            >
              <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
              {typeLabels[submission.type]}
            </Badge>
            <ScreenshotGallery urls={screenshotUrls} title={submission.title} />
          </div>
        ) : (
          <div className={cn("flex items-center justify-center py-6", typeBgColors[submission.type])}>
            <TypeIcon size={32} className="text-muted-foreground/20" />
          </div>
        )}
      </a>

      <CardHeader className="flex flex-col gap-2 sm:grid">
        <div className="flex items-center gap-2">
          <a href={`/workshop/${submission.id}/`} className="min-w-0 hover:underline" title={submission.title}>
            <CardTitle className="truncate">{submission.title}</CardTitle>
          </a>
          {!hasScreenshots && (
            <Badge variant="secondary" className="shrink-0 gap-1.5 px-2">
              <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
              {typeLabels[submission.type]}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          <a
            href={submission.authorGithubProfileUrl || undefined}
            target={submission.authorGithubProfileUrl ? "_blank" : undefined}
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            {submission.authorAvatarUrl && (
              <img src={submission.authorAvatarUrl} alt="" className="size-4 rounded-full object-cover" />
            )}
            {submission.authorName}
          </a>{" "}
          · v{submission.revision} · {formatRelativeTime(submission.created)}
        </CardDescription>
        <CardAction className="col-start-auto row-span-1 row-start-auto self-auto justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-start sm:justify-self-end">
          <div className="flex items-center gap-px rounded-md border border-border bg-muted/40 p-px">
            <button
              type="button"
              onClick={() => void onVote(submission.id, 1)}
              aria-label="Upvote"
              aria-pressed={userVote === 1}
              className={cn(
                "flex size-10 items-center justify-center rounded-[5px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-8",
                userVote === 1 && "bg-primary/15 text-primary",
              )}
            >
              <IconArrowBigUp size={14} />
            </button>
            <span
              className={cn(
                "min-w-5 text-center text-xs font-semibold tabular-nums",
                score > 0 && "text-foreground",
                score < 0 && "text-destructive",
              )}
            >
              {score}
            </span>
            <button
              type="button"
              onClick={() => void onVote(submission.id, -1)}
              aria-label="Downvote"
              aria-pressed={userVote === -1}
              className={cn(
                "flex size-10 items-center justify-center rounded-[5px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-8",
                userVote === -1 && "bg-primary/15 text-primary",
              )}
            >
              <IconArrowBigDown size={14} />
            </button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {submission.outdated && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">Outdated</Badge>
          </div>
        )}
        {submission.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{submission.description}</p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3 px-3 py-2.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <IconMessage size={14} /> {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
        </span>
        <Button
          className="h-10 sm:h-7"
          size="sm"
          nativeButton={false}
          render={<a href={`/workshop/${submission.id}/`} aria-label={`View ${submission.title} details`} />}
        >
          <IconEye size={14} /> View details
        </Button>
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
    <CardFooter className="justify-between gap-3 px-3 py-2.5">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-9 w-28 animate-pulse rounded bg-muted" />
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
            type="button"
            className="absolute left-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={(event) => {
              stopCardNavigation(event);
              setIdx((i) => (i - 1 + urls.length) % urls.length);
            }}
            aria-label="Previous screenshot"
          >
            <IconChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={(event) => {
              stopCardNavigation(event);
              setIdx((i) => (i + 1) % urls.length);
            }}
            aria-label="Next screenshot"
          >
            <IconChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/50 px-2 py-1">
            {urls.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={(event) => {
                  stopCardNavigation(event);
                  setIdx(i);
                }}
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
