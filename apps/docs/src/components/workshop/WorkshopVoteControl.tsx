"use client";

import { IconArrowBigDown, IconArrowBigUp } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WorkshopVoteControlProps {
  score: number;
  userVote?: 1 | -1;
  onVote: (value: 1 | -1) => void;
  compact?: boolean;
  className?: string;
}

export function WorkshopVoteControl({ score, userVote, onVote, compact = false, className }: WorkshopVoteControlProps) {
  const upvoteLabel = userVote === 1 ? "Remove upvote" : "Upvote";
  const downvoteLabel = userVote === -1 ? "Remove downvote" : "Downvote";

  return (
    <TooltipProvider delay={350}>
      <div
        className={cn(
          "flex items-center gap-px rounded-lg border border-border bg-muted/40",
          compact ? "p-px" : "p-1",
          className,
        )}
        aria-label="Submission score"
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size={compact ? "icon-sm" : "icon"}
                aria-label={upvoteLabel}
                aria-pressed={userVote === 1}
                onClick={() => onVote(1)}
                className={cn(userVote === 1 && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary")}
              />
            }
          >
            <IconArrowBigUp />
          </TooltipTrigger>
          <TooltipContent>{upvoteLabel}</TooltipContent>
        </Tooltip>

        <span
          aria-live="polite"
          className={cn(
            "text-center font-semibold tabular-nums text-foreground",
            compact ? "min-w-5 text-xs" : "min-w-7 text-sm",
          )}
        >
          {score}
        </span>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size={compact ? "icon-sm" : "icon"}
                aria-label={downvoteLabel}
                aria-pressed={userVote === -1}
                onClick={() => onVote(-1)}
                className={cn(userVote === -1 && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary")}
              />
            }
          >
            <IconArrowBigDown />
          </TooltipTrigger>
          <TooltipContent>{downvoteLabel}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
