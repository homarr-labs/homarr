import React, { useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import { IconChevronLeft, IconChevronRight, IconTrash } from "@tabler/icons-react";
import { Highlight, themes } from "prism-react-renderer";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@site/src/lib/utils";

const prismThemes = { light: themes.github, dark: themes.dracula } as const;
const colorModeKeys = { dark: "dark", light: "light" } as const;
const dotClass = ["bg-white/40", "bg-white"];

export const DetailSkeleton = () => (
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

export const ScreenshotGallery = ({ urls, title }: { urls: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);

  return (
    <div className="group/gallery relative w-full">
      <div className="aspect-video overflow-hidden rounded-lg bg-muted">
        <img className="h-full w-full object-cover" src={urls[idx]} alt={`${title} screenshot ${idx + 1}`} />
      </div>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Previous screenshot"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-background/80 opacity-60 shadow transition-opacity hover:opacity-100"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
            aria-label="Next screenshot"
          >
            <IconChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
            {urls.map((_, i) => (
              <button
                type="button"
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

export const DeleteConfirmButton = ({ onConfirm }: { onConfirm: () => void }) => {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-10 text-destructive hover:bg-destructive/10 sm:h-7"
        onClick={() => setOpened(true)}
      >
        <IconTrash size={14} /> Delete
      </Button>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete submission?</DialogTitle>
            <DialogDescription>
              This permanently removes the Workshop listing, screenshots, votes, reports, and comments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpened(false);
                onConfirm();
              }}
            >
              Delete submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
