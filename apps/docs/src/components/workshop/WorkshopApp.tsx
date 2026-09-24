"use client";

import React, { useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconBrandCss3,
  IconBrandGithub,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconFlag,
  IconMessage,
  IconPackage,
  IconPlus,
  IconPuzzle,
  IconRefresh,
  IconSearch,
  IconShield,
  IconX,
} from "@tabler/icons-react";

import type { WorkshopSubmission } from "@site/src/lib/pocketbase";
import type { SubmissionType } from "@site/src/lib/workshop-schema";
import { githubAvatarUrl, githubProfileUrl } from "@homarr/workshop/schema";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { SubmitForm } from "./SubmitForm";
import { WorkshopAccountMenu } from "./WorkshopAccountMenu";
import { WorkshopVoteControl } from "./WorkshopVoteControl";
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
const cardMediaClassName = "aspect-video w-full overflow-hidden bg-muted";
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

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

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
  const openReportCount = workshop.submissions.reduce((total, submission) => total + submission.reportCount, 0);
  const hasFilters = typeFilter !== "all" || search.length > 0 || !includeOutdated;
  const clearFilters = () => {
    setTypeFilter("all");
    setSearch("");
    setIncludeOutdated(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 sm:pb-16">
      <div className="flex flex-col gap-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="homarr-content-title">Workshop</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Discover community-made widgets and CSS. Review the source, then import it into Homarr.
          </p>
          <a href="/docs/workshop/" className="mt-2 inline-block text-sm underline underline-offset-4">
            How to install Workshop content
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {workshop.user ? (
            <>
              {workshop.user.isAdmin && (
                <Button
                  variant="outline"
                  className="h-10 sm:h-8"
                  nativeButton={false}
                  render={<a href="/workshop/admin" aria-label={`Open moderation, ${openReportCount} open reports`} />}
                >
                  <IconShield size={14} /> Moderation{openReportCount > 0 ? ` (${openReportCount})` : ""}
                </Button>
              )}
              <Button className="h-10 sm:h-8" onClick={() => setShowSubmit(true)}>
                <IconPlus size={14} /> Share yours
              </Button>
              <WorkshopAccountMenu
                user={workshop.user}
                onSignOut={() => {
                  setTypeFilter("all");
                  workshop.logout();
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Button variant="outline" className="h-10 sm:h-8" onClick={() => void workshop.login()}>
                <IconBrandGithub size={14} /> Sign in with GitHub
              </Button>
              <p className="text-xs text-muted-foreground">Vote, comment, report, and publish</p>
            </div>
          )}
        </div>
      </div>

      {workshop.loading && workshop.submissions.length === 0 && (
        <>
          <output className="sr-only">Loading Workshop listings</output>
          <WorkshopFiltersSkeleton />
        </>
      )}

      {workshop.submissions.length > 0 && (
        <section
          aria-label="Filter Workshop submissions"
          className="mb-3 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <InputGroup className="h-11 w-full lg:order-last lg:h-9 lg:w-72">
            <InputGroupAddon>
              <IconSearch size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search Workshop"
              aria-description="Search titles, descriptions, and authors"
              aria-label="Search submissions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <Button variant="ghost" size="icon-sm" aria-label="Clear search" onClick={() => setSearch("")}>
                  <IconX size={14} />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <ToggleGroup
              value={[typeFilter]}
              onValueChange={(values) => values[0] && setTypeFilter(values[0] as TypeFilter)}
              variant="default"
              size="sm"
              spacing={0}
              className={cn("grid min-w-0 bg-muted/40 sm:flex", workshop.user ? "grid-cols-4" : "grid-cols-3")}
              aria-label="Submission type"
            >
              {availableTypeFilters.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className="min-h-10 min-w-0 gap-1.5 px-3 text-sm data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm sm:min-h-8 sm:text-xs"
                >
                  {opt.dot && <span className={cn("size-2 rounded-full", opt.dot)} />}
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger aria-label="Sort submissions" className="h-10 min-w-40 flex-1 sm:h-8 sm:flex-none">
                  <SelectValue>{(value) => sortOptions.find((option) => option.value === value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="h-10 shrink-0 cursor-pointer rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground sm:h-8">
                <Switch
                  size="sm"
                  checked={!includeOutdated}
                  onCheckedChange={(checked) => setIncludeOutdated(!checked)}
                />
                Hide outdated
              </Label>
            </div>
          </div>
        </section>
      )}

      {workshop.submissions.length > 0 && (
        <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
          <output className="text-sm text-muted-foreground">
            {workshop.loading
              ? "Refreshing listings…"
              : `${visible.length} of ${workshop.submissions.length} submissions`}
            {search.trim() && <span className="sr-only"> matching {search.trim()}</span>}
          </output>
          {hasFilters && visible.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Reset filters
            </Button>
          )}
        </div>
      )}

      {initialLoadFailed && (
        <Empty className="min-h-80 border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <IconAlertCircle size={22} />
            </EmptyMedia>
            <EmptyTitle>Workshop listings could not be loaded</EmptyTitle>
            <EmptyDescription>Check the Workshop service and your connection, then try again.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void workshop.refresh()}>
              <IconRefresh size={15} /> Try loading again
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {workshop.error && workshop.submissions.length > 0 && (
        <Alert variant="destructive" className="mb-4 grid-cols-[auto_1fr_auto] items-center">
          <IconAlertCircle />
          <div>
            <AlertTitle>Workshop data is out of date</AlertTitle>
            <AlertDescription>The last refresh failed. Existing listings are still available.</AlertDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void workshop.refresh()}>
            <IconRefresh size={14} /> Retry
          </Button>
        </Alert>
      )}

      {workshop.loading && workshop.submissions.length === 0 && (
        <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!workshop.loading && !workshop.error && visible.length === 0 && (
        <Empty className="border border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPackage />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            <EmptyDescription>{empty.hint}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {workshop.submissions.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Reset filters
              </Button>
            )}
            {workshop.submissions.length === 0 && (
              <Button size="sm" onClick={() => (workshop.user ? setShowSubmit(true) : void workshop.login())}>
                {workshop.user ? <IconPlus /> : <IconBrandGithub />}
                {workshop.user ? "Create submission" : "Sign in to share"}
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}

      <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            backend={workshop.backend}
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
  backend: ReturnType<typeof useWorkshop>["backend"];
  userVote?: 1 | -1;
  onVote: (submissionId: string, value: 1 | -1) => void;
}

const SubmissionCard = ({ submission, backend, userVote, onVote }: SubmissionCardProps) => {
  const score = submission.upvotes - submission.downvotes;
  const screenshotUrls = useMemo(
    () => submission.screenshots?.map((file) => backend.fileUrl(submission.id, file)) ?? [],
    [submission, backend],
  );

  const hasScreenshots = screenshotUrls.length > 0;
  const TypeIcon = typeIcons[submission.type];

  return (
    <Card className="relative flex h-full min-w-0 w-full flex-col pt-0">
      {hasScreenshots ? (
        <div className="relative shrink-0">
          <Badge variant="secondary" className="absolute left-2 top-2 z-10 gap-1.5 bg-background px-2">
            <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
            {typeLabels[submission.type]}
          </Badge>
          <ScreenshotGallery urls={screenshotUrls} title={submission.title} href={`/workshop/${submission.id}/`} />
        </div>
      ) : (
        <a href={`/workshop/${submission.id}/`} className="block shrink-0" aria-label={`View ${submission.title}`}>
          <div className={cn(cardMediaClassName, "flex items-center justify-center", typeBgColors[submission.type])}>
            <TypeIcon size={32} className="text-muted-foreground/20" />
          </div>
        </a>
      )}

      <CardHeader className="grid gap-2">
        <div className="flex items-center gap-2">
          <a href={`/workshop/${submission.id}/`} className="min-w-0 hover:underline" title={submission.title}>
            <h2 className="line-clamp-2 text-lg font-semibold leading-snug">{submission.title}</h2>
          </a>
          {!hasScreenshots && (
            <Badge variant="secondary" className="shrink-0 gap-1.5 px-2">
              <span className={cn("size-2 rounded-full", typeDotColors[submission.type])} />
              {typeLabels[submission.type]}
            </Badge>
          )}
        </div>
        <CardDescription className="flex min-w-0 items-center gap-1 text-xs">
          <a
            href={githubProfileUrl(submission.authorName) || undefined}
            target={submission.authorName ? "_blank" : undefined}
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
          >
            <Avatar className="size-4">
              {submission.authorName && <AvatarImage src={githubAvatarUrl(submission.authorName)} alt="" />}
              <AvatarFallback className="text-[9px]">{avatarFallback(submission.authorName)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{submission.authorName || "Community member"}</span>
          </a>
          <span className="shrink-0 whitespace-nowrap">
            · v{submission.revision} · {formatRelativeTime(submission.created)}
          </span>
        </CardDescription>
        <CardAction>
          <WorkshopVoteControl
            score={score}
            userVote={userVote}
            compact
            onVote={(value) => void onVote(submission.id, value)}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="min-h-[4.5rem] flex-1 overflow-hidden">
        {(submission.outdated || submission.reportCount > 0) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {submission.outdated && <Badge variant="secondary">Outdated</Badge>}
            {submission.reportCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <IconFlag size={12} /> {submission.reportCount} {submission.reportCount === 1 ? "report" : "reports"}
              </Badge>
            )}
          </div>
        )}
        {submission.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{submission.description}</p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3 px-3 py-2.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <IconMessage size={14} /> {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
        </span>
        <Button
          variant="outline"
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

const SkeletonCard = () => (
  <Card className="h-full min-w-0 w-full">
    <Skeleton className="aspect-video rounded-none" />
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-40" />
    </CardHeader>
    <CardContent className="min-h-[4.5rem]">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </CardContent>
    <CardFooter className="justify-between gap-3 px-3 py-2.5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-28" />
    </CardFooter>
  </Card>
);

const WorkshopFiltersSkeleton = () => (
  <div aria-hidden="true">
    <div className="mb-3 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
      <Skeleton className="h-11 w-full lg:order-last lg:h-9 lg:w-72" />
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-3 sm:flex">
          {["All", "Widgets", "CSS"].map((label) => (
            <Skeleton key={label} className="h-10 min-w-0 px-3 sm:h-8">
              <span className="invisible text-sm sm:text-xs">{label}</span>
            </Skeleton>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 min-w-40 flex-1 sm:h-8 sm:flex-none" />
          <Skeleton className="h-10 w-36 shrink-0 sm:h-8" />
        </div>
      </div>
    </div>
    <div className="mb-3 flex min-h-9 items-center">
      <Skeleton className="h-5 w-36" />
    </div>
  </div>
);

export const WorkshopListingFallback = () => (
  <div className="mx-auto max-w-7xl px-4 pb-28 sm:pb-16" aria-busy="true" aria-label="Loading Workshop listings">
    <div className="flex flex-col gap-5 py-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="homarr-content-title">Workshop</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Discover community-made widgets and CSS. Review the source, then import it into Homarr.
        </p>
      </div>
      <Skeleton className="h-10 w-40 sm:h-8" />
    </div>

    <WorkshopFiltersSkeleton />

    <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  </div>
);

const ScreenshotGallery = ({ urls, title, href }: { urls: string[]; title: string; href: string }) => {
  const [idx, setIdx] = useState(0);
  const dotClass = ["bg-white/40", "bg-white"];

  return (
    <div className="group/gallery relative">
      <a href={href} className={cn("block", cardMediaClassName)} aria-label={`View ${title}`}>
        <img
          className="h-full w-full object-cover"
          src={urls[idx]}
          alt={`${title} screenshot ${idx + 1}`}
          loading="lazy"
        />
      </a>
      {urls.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90 opacity-85 shadow-sm hover:opacity-100 sm:size-8"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Previous screenshot"
          >
            <IconChevronLeft size={14} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90 opacity-85 shadow-sm hover:opacity-100 sm:size-8"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
            aria-label="Next screenshot"
          >
            <IconChevronRight size={14} />
          </Button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 rounded-full bg-black/60 px-1 py-0.5">
            {urls.map((_, i) => (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Screenshot ${i + 1}`}
                aria-current={i === idx ? "true" : undefined}
                className="size-8 rounded-full hover:bg-white/10 focus-visible:ring-white"
              >
                <span className={cn("size-1.5 rounded-full transition-colors", dotClass[Number(i === idx)])} />
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
