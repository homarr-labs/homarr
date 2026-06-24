import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBraces,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFileUpload,
  IconLoader2,
  IconPalette,
  IconPhoto,
  IconUpload,
  IconX,
} from "@tabler/icons-react";

import type { SubmissionType } from "@site/src/lib/store-schema";
import { validateSubmissionContent } from "@site/src/lib/store-schema";

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
import { Textarea } from "@/components/ui/textarea";
import { cn, errorMessage } from "@/lib/utils";

import type { SubmitInput } from "./useStore";

interface Props {
  onClose: () => void;
  onSubmit: (input: SubmitInput) => Promise<void>;
}

const steps = ["Type", "Details", "Media"] as const;
const navDirection = [-1, 1];
const stepAnimClass = ["submit-step-from-left", "submit-step-from-right"];
const backLabels = ["Cancel", "Back"];
const submitLabels = ["Submit", "Submitting…"];
const connectorClass = ["bg-border", "bg-primary"];
const dropOverlayClass = ["pointer-events-none opacity-0", "opacity-100"];

const placeholders: Record<SubmissionType, string> = {
  widget: '{\n  "$schema": "homarr-custom-widget-v2",\n  "name": "My widget",\n  ...\n}',
  css: ".grid-stack-item-content {\n  border-radius: 16px;\n}",
};
const contentLabels: Record<SubmissionType, string> = {
  widget: "Widget JSON (homarr-custom-widget-v2)",
  css: "Custom CSS",
};

const parseJsonObject = (json: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    /* invalid json */
  }
  return null;
};

export const SubmitForm = ({ onClose, onSubmit }: Props) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [type, setType] = useState<SubmissionType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [jsonDropHint, setJsonDropHint] = useState(false);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const canAdvance = [type !== null, title.trim().length >= 3 && content.trim().length > 0, true];

  const goTo = (next: number) => {
    setDirection(navDirection[Number(next > step)]);
    setStep(next);
  };

  const setContentAndAutofill = useCallback((json: string, currentTitle: string, currentDesc: string) => {
    setContent(json);
    const meta = parseJsonObject(json);
    if (!meta) return;
    if (typeof meta.name === "string" && !currentTitle) setTitle(meta.name);
    if (typeof meta.description === "string" && !currentDesc) setDescription(String(meta.description));
  }, []);

  const handleJsonFileDrop = useCallback(
    (files: FileList | File[]) => {
      const jsonFile = Array.from(files).find((f) => f.name.endsWith(".json") || f.type === "application/json");
      if (!jsonFile) return false;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!type) setType("widget");
        setContentAndAutofill(text, title, description);
        if (step === 0) goTo(1);
      };
      reader.onerror = () => setError("Could not read the file");
      reader.readAsText(jsonFile);
      return true;
    },
    [type, step, title, description, setContentAndAutofill],
  );

  const addImageFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 5 - screenshots.length);
      if (incoming.length === 0) return;
      setScreenshots((prev) => [...prev, ...incoming].slice(0, 5));
      const urls = incoming.map((f) => {
        const url = URL.createObjectURL(f);
        previewUrlsRef.current.add(url);
        return url;
      });
      setPreviews((prev) => [...prev, ...urls].slice(0, 5));
    },
    [screenshots.length],
  );

  const removeScreenshot = (idx: number) => {
    const url = previews[idx];
    if (url) {
      previewUrlsRef.current.delete(url);
      URL.revokeObjectURL(url);
    }
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach(URL.revokeObjectURL);
      previewUrlsRef.current.clear();
    },
    [],
  );

  const handleGlobalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setJsonDropHint(false);
      if (!handleJsonFileDrop(e.dataTransfer.files) && step === 2) addImageFiles(e.dataTransfer.files);
    },
    [handleJsonFileDrop, step, addImageFiles],
  );

  const handleSubmit = async () => {
    if (!type) return;
    const validation = validateSubmissionContent(type, content);
    if (!validation.success) {
      setError(validation.error);
      goTo(1);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit({ type, title, description, content, screenshots });
    } catch (caught) {
      setError(errorMessage(caught, "Submission failed"));
    } finally {
      setPending(false);
    }
  };

  const onContentChange = (value: string) => {
    if (type === "widget") setContentAndAutofill(value, title, description);
    else setContent(value);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!pending}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setJsonDropHint(true);
        }}
        onDragLeave={() => setJsonDropHint(false)}
        onDrop={handleGlobalDrop}
      >
        <div
          aria-hidden={!jsonDropHint}
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-primary/10 backdrop-blur-sm transition-opacity duration-200",
            dropOverlayClass[Number(jsonDropHint)],
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <IconFileUpload size={28} />
          </div>
          <p className="text-sm font-semibold">Drop JSON file to import widget</p>
          <p className="text-xs text-muted-foreground">Title and description will be auto-filled</p>
        </div>

        <DialogHeader>
          <DialogTitle>Share with the community</DialogTitle>
          <DialogDescription>Submit a custom CSS theme or widget to the Workshop.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className={cn("h-px flex-1 transition-colors", connectorClass[Number(i <= step)])} />}
              <button
                onClick={() => {
                  if (i < step) goTo(i);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  i === step && "bg-primary text-primary-foreground shadow-sm",
                  i < step && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <IconCheck size={12} /> : <span className="tabular-nums">{i + 1}</span>}
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="relative min-h-[280px] overflow-hidden">
          <div key={step} className={cn("submit-step-enter", stepAnimClass[Number(direction > 0)])}>
            {step === 0 && <StepType value={type} onChange={setType} onJsonDrop={handleJsonFileDrop} />}
            {step === 1 && type && (
              <StepDetails
                type={type}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                content={content}
                onContentChange={onContentChange}
              />
            )}
            {step === 2 && (
              <StepMedia previews={previews} addFiles={addImageFiles} removeScreenshot={removeScreenshot} />
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 0) onClose();
              else goTo(step - 1);
            }}
            disabled={pending}
          >
            <IconChevronLeft size={14} /> {backLabels[Math.min(step, 1)]}
          </Button>
          <div className="flex items-center gap-2">
            {step < 2 && (
              <Button onClick={() => goTo(step + 1)} disabled={!canAdvance[step]}>
                Next <IconChevronRight size={14} />
              </Button>
            )}
            {step >= 2 && (
              <Button onClick={() => void handleSubmit()} disabled={pending || !canAdvance[1]}>
                {pending && <IconLoader2 size={14} className="animate-spin" />}
                {submitLabels[Number(pending)]}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const typeCards: { type: SubmissionType; icon: typeof IconBraces; label: string; desc: string }[] = [
  {
    type: "widget",
    icon: IconBraces,
    label: "Custom Widget",
    desc: "A JSON-based widget using the homarr-custom-widget-v2 schema",
  },
  { type: "css", icon: IconPalette, label: "Custom CSS", desc: "A CSS theme or style override for Homarr dashboards" },
];

const StepType = ({
  value,
  onChange,
  onJsonDrop,
}: {
  value: SubmissionType | null;
  onChange: (t: SubmissionType) => void;
  onJsonDrop: (files: FileList | File[]) => boolean;
}) => {
  const [dropActive, setDropActive] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {typeCards.map(({ type, icon: Icon, label, desc }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              "group flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5",
              value === type ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border bg-card",
            )}
          >
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-xl transition-colors",
                value === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
              )}
            >
              <Icon size={24} />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
            {value === type && (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <IconCheck size={12} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropActive(false);
          onJsonDrop(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition-all hover:border-primary/40 hover:bg-primary/5",
          dropActive && "border-primary bg-primary/10",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <IconFileUpload size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium">Or drop a .json file here</p>
          <p className="text-xs text-muted-foreground">Auto-selects Widget type and fills title from JSON</p>
        </div>
        <input
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onJsonDrop(e.target.files);
          }}
        />
      </label>
    </div>
  );
};

const StepDetails = ({
  type,
  title,
  setTitle,
  description,
  setDescription,
  content,
  onContentChange,
}: {
  type: SubmissionType;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-1.5">
      <label htmlFor="submit-content" className="text-xs font-medium text-muted-foreground">
        {contentLabels[type]} *
      </label>
      <Textarea
        id="submit-content"
        className="font-mono text-xs"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={placeholders[type]}
        rows={8}
        required
      />
      {type === "widget" && (
        <p className="text-xs text-muted-foreground">
          Paste your widget JSON — title and description will auto-fill from the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">name</code> field.
        </p>
      )}
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="submit-title" className="text-xs font-medium text-muted-foreground">
        Title *
      </label>
      <Input
        id="submit-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={3}
        maxLength={100}
        placeholder="My awesome theme"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="submit-description" className="text-xs font-medium text-muted-foreground">
        Description
      </label>
      <Textarea
        id="submit-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="A brief description of what this does"
      />
    </div>
  </div>
);

const mediaDropState = {
  idle: { Icon: IconUpload, title: "Drag & drop or click to upload", iconClass: "bg-muted text-muted-foreground" },
  active: { Icon: IconPhoto, title: "Drop images here", iconClass: "bg-primary text-primary-foreground" },
} as const;

const StepMedia = ({
  previews,
  addFiles,
  removeScreenshot,
}: {
  previews: string[];
  addFiles: (files: FileList | File[]) => void;
  removeScreenshot: (idx: number) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);
  const { Icon: DropIcon, title: dropTitle, iconClass: dropIconClass } = mediaDropState[dragOver ? "active" : "idle"];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs font-medium text-muted-foreground">Screenshots (optional, up to 5)</span>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          Add screenshots to help others preview your submission.
        </p>
      </div>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-all hover:border-primary/50 hover:bg-primary/5",
          dragOver && "border-primary bg-primary/10",
          previews.length >= 5 && "pointer-events-none opacity-50",
        )}
      >
        <div className={cn("flex size-10 items-center justify-center rounded-xl transition-colors", dropIconClass)}>
          <DropIcon size={20} />
        </div>
        <div>
          <p className="font-heading text-sm font-medium">{dropTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">PNG, JPG, WebP up to 5 images</p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
          }}
        />
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removeScreenshot(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove screenshot ${i + 1}`}
              >
                <IconX size={16} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
