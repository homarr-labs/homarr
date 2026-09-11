"use client";

import { IconBrandGithub, IconChevronDown, IconExternalLink, IconLogout } from "@tabler/icons-react";

import { githubAvatarUrl, githubProfileUrl } from "@homarr/workshop/schema";
import type { WorkshopUser } from "@homarr/workshop/schema";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const avatarFallback = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

interface WorkshopAccountMenuProps {
  user: WorkshopUser;
  onSignOut: () => void;
}

export const WorkshopAccountMenu = ({ user, onSignOut }: WorkshopAccountMenuProps) => {
  const profileUrl = githubProfileUrl(user.name);
  const avatarUrl = githubAvatarUrl(user.name);
  const accountLabel = user.name ? `@${user.name}` : "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="h-10 gap-2 px-2 sm:h-8" aria-label="Workshop account menu" />
        }
      >
        <Avatar className="size-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-[10px]">{avatarFallback(user.name)}</AvatarFallback>
        </Avatar>
        <span className="max-w-36 truncate">{accountLabel}</span>
        <IconChevronDown size={13} aria-hidden="true" className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64" aria-label="Workshop account">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal text-foreground">
          <Avatar className="size-9">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback>{avatarFallback(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{accountLabel}</p>
            <p className="text-xs text-muted-foreground">Workshop account</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {profileUrl && (
          <DropdownMenuItem
            render={
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="no-underline"
                aria-label="View GitHub profile"
              />
            }
          >
            <IconBrandGithub aria-hidden="true" />
            View GitHub profile
            <IconExternalLink aria-hidden="true" className="ml-auto text-muted-foreground" />
          </DropdownMenuItem>
        )}

        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <IconLogout aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
