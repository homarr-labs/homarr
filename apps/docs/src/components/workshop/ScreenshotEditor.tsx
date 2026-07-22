import { useState } from "react";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScreenshotEditorItem {
  id: string;
  src: string;
  badge?: string;
}

interface ScreenshotEditorProps {
  items: ScreenshotEditorItem[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  description?: string;
  max?: number;
}

const dropState = {
  idle: { Icon: IconUpload, title: "Choose or drop images", iconClass: "bg-muted text-muted-foreground" },
  active: { Icon: IconPhoto, title: "Drop images here", iconClass: "bg-primary text-primary-foreground" },
} as const;

export const ScreenshotEditor = ({
  items,
  onAdd,
  onRemove,
  disabled = false,
  description = "Add screenshots to help others preview your submission.",
  max = 5,
}: ScreenshotEditorProps) => {
  const [dragOver, setDragOver] = useState(false);
  const full = items.length >= max;
  const { Icon, title, iconClass } = dropState[dragOver ? "active" : "idle"];

  return (
    <section className="flex flex-col gap-3" aria-labelledby="workshop-screenshots-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="workshop-screenshots-heading" className="text-sm font-medium">
            Screenshots
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {items.length}/{max}
        </span>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={item.src} alt={`Screenshot ${index + 1}`} className="size-full object-cover" />
              {item.badge && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm">
                  {item.badge}
                </span>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                className="absolute top-1.5 right-1.5 opacity-90 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label={`Remove screenshot ${index + 1}`}
              >
                <IconX size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <label
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragOver(false);
            if (!disabled) onAdd(event.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/5",
            dragOver && "border-primary bg-primary/10",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconClass)}>
            <Icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{title}</span>
            <span className="block text-xs text-muted-foreground">PNG, JPG, or WebP · up to 5 MB each</span>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(event) => {
              if (event.target.files) onAdd(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      )}
    </section>
  );
};
