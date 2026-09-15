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

export const DetailSkeleton = () => (
  <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Skeleton className="h-4 w-24" />
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
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
