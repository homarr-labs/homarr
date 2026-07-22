import React, { useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import { IconChevronLeft, IconChevronRight, IconTrash } from "@tabler/icons-react";
import { Highlight, themes } from "prism-react-renderer";

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

const prismThemes = { light: themes.github, dark: themes.dracula } as const;
const colorModeKeys = { dark: "dark", light: "light" } as const;

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

  return (
    <div className="group/gallery w-full">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        <img className="h-full w-full object-contain" src={urls[idx]} alt={`${title} screenshot ${idx + 1}`} />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg bg-background/85 opacity-80 shadow-sm transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring sm:size-9"
              onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
              aria-label="Previous screenshot"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg bg-background/85 opacity-80 shadow-sm transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring sm:size-9"
              onClick={() => setIdx((i) => (i + 1) % urls.length)}
              aria-label="Next screenshot"
            >
              <IconChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <fieldset className="mt-3 min-w-0">
          <legend className="sr-only">Screenshot previews</legend>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {urls.map((url, i) => {
              const selected = i === idx;
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

export const CodeBlock = ({ content, language }: { content: string; language: string }) => {
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
