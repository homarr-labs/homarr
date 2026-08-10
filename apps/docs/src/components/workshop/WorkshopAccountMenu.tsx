import React, { useEffect, useRef, useState } from "react";
import { IconBrandGithub, IconChevronDown, IconExternalLink, IconLogout } from "@tabler/icons-react";

import { githubAvatarUrl, githubProfileUrl } from "@homarr/workshop/schema";
import type { WorkshopUser } from "@homarr/workshop/schema";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

interface WorkshopAccountMenuProps {
  user: WorkshopUser;
  onSignOut: () => void;
}

export const WorkshopAccountMenu = ({ user, onSignOut }: WorkshopAccountMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const profileUrl = githubProfileUrl(user.githubUsername);
  const avatarUrl = githubAvatarUrl(user.githubUsername);
  const accountLabel = user.githubUsername ? `@${user.githubUsername}` : "Account";

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-10 gap-2 px-2 sm:h-8"
        aria-label="Workshop account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar className="size-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-[10px]">{avatarFallback(user.githubUsername)}</AvatarFallback>
        </Avatar>
        <span className="max-w-36 truncate">{accountLabel}</span>
        <IconChevronDown
          size={13}
          aria-hidden="true"
          className={cn("text-muted-foreground transition-transform duration-150", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Workshop account"
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="size-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback>{avatarFallback(user.githubUsername)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{accountLabel}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          {profileUrl && (
            <a
              role="menuitem"
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => setOpen(false)}
            >
              <IconBrandGithub size={16} aria-hidden="true" />
              View GitHub profile
              <IconExternalLink size={14} aria-hidden="true" className="ml-auto text-muted-foreground" />
            </a>
          )}

          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <IconLogout size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
