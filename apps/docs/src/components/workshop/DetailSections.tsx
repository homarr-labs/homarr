"use client";

import React, { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconTrash } from "@tabler/icons-react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@site/src/lib/utils";
import { clampScreenshotIndex } from "./workshop-utils";

export const detailLayout = {
  shell: "marketplace w-full min-h-[80vh] bg-background text-foreground",
  container: "mx-auto max-w-[90rem] px-4 pb-28 pt-8 sm:px-6 sm:pb-20 lg:px-8",
  grid: "grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]",
  sidebar: "space-y-6 xl:sticky xl:top-24",
};

export const DetailSkeleton = () => (
  <div className={detailLayout.shell}>
    <div className={detailLayout.container} role="status" aria-label="Loading submission" aria-busy="true">
      <div aria-hidden="true">
        <div className="mb-6 inline-flex items-center px-2.5 py-1.5">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className={detailLayout.grid}>
          <div className="min-w-0">
            <div className="border-b border-border pb-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-9 w-2/3 sm:h-10" />
                  <Skeleton className="mt-3 h-6 w-full" />
                  <div className="mt-5 flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
            <div className="mt-8">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="mt-1 h-5 w-64 max-w-full" />
              <Skeleton className="mt-3 h-[min(58vh,640px)] w-full rounded-xl" />
            </div>
            <div className="mt-12 border-t border-border pt-9">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="mt-4 h-20 w-full" />
            </div>
          </div>
          <div className={detailLayout.sidebar}>
            <div className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-7 w-40" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-11 w-40 sm:h-8" />
                <Skeleton className="h-11 w-24 sm:h-8" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-6 w-32" />
              <div className="mt-5 space-y-5">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ScreenshotGallery = ({ urls, title }: { urls: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);
  const selectedIndex = clampScreenshotIndex(idx, urls.length);
  useEffect(() => setIdx((current) => clampScreenshotIndex(current, urls.length)), [urls.length]);

  if (urls.length === 0) return null;

  return (
    <div className="group/gallery w-full">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        <img
          className="h-full w-full object-contain"
          src={urls[selectedIndex]}
          alt={`${title} screenshot ${selectedIndex + 1}`}
        />
        {urls.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 opacity-85 shadow-sm hover:opacity-100"
              onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
              aria-label="Previous screenshot"
            >
              <IconChevronLeft size={16} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 opacity-85 shadow-sm hover:opacity-100"
              onClick={() => setIdx((i) => (i + 1) % urls.length)}
              aria-label="Next screenshot"
            >
              <IconChevronRight size={16} />
            </Button>
            <span className="absolute right-3 bottom-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium tabular-nums shadow-sm">
              {selectedIndex + 1} / {urls.length}
            </span>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <fieldset className="mt-3 min-w-0">
          <legend className="sr-only">Screenshot previews</legend>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {urls.map((url, i) => {
              const selected = i === selectedIndex;
              return (
                <button
                  type="button"
                  key={url}
                  onClick={() => setIdx(i)}
                  aria-label={`Show screenshot ${i + 1}`}
                  aria-pressed={selected}
                  className={cn(
                    "aspect-video w-24 shrink-0 overflow-hidden rounded-md border-2 bg-muted transition-[border-color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-28",
                    selected
                      ? "border-primary opacity-100 ring-2 ring-primary/20"
                      : "border-border opacity-65 hover:border-muted-foreground/60 hover:opacity-100",
                  )}
                >
                  <img className="h-full w-full object-cover" src={url} alt="" loading={selected ? "eager" : "lazy"} />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
};

export const CodeBlock = ({ content, language }: { content: string; language: string }) => (
  <DynamicCodeBlock lang={language} code={content} />
);

export const DeleteConfirmButton = ({ onConfirm, className }: { onConfirm: () => void; className?: string }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm" className={cn("text-destructive hover:bg-destructive/10", className)} />
        }
      >
        <IconTrash size={14} /> Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <IconTrash />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete submission?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the Workshop listing, screenshots, votes, reports, and comments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete submission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
