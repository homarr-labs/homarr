"use client";

import type { ReactElement } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconArrowBigDown, IconArrowBigDownFilled, IconArrowBigUp, IconArrowBigUpFilled } from "@tabler/icons-react";

import type { WorkshopVoteControlViewProps } from "./contracts";

export function WorkshopVoteControlView({
  score,
  ownVote,
  canVote,
  pending,
  pendingDirection,
  size = "md",
  upvoteLabel,
  downvoteLabel,
  scoreLabel,
  signInHint,
  onCastVote,
}: WorkshopVoteControlViewProps) {
  const iconSize = size === "sm" ? 16 : 18;
  const controlSize = size === "sm" ? "sm" : "md";
  const upvoted = ownVote === 1;
  const downvoted = ownVote === -1;

  const controls = (
    <Group gap={2} wrap="nowrap">
      <MaybeTooltip label={canVote ? upvoteLabel : undefined}>
        <ActionIcon
          variant={upvoted ? "light" : "subtle"}
          color={upvoted ? "red" : "gray"}
          size={controlSize}
          aria-label={upvoteLabel}
          aria-pressed={upvoted}
          loading={pending && pendingDirection === 1}
          disabled={!canVote || pending}
          onClick={() => onCastVote(1)}
        >
          {upvoted ? <IconArrowBigUpFilled size={iconSize} /> : <IconArrowBigUp size={iconSize} stroke={1.5} />}
        </ActionIcon>
      </MaybeTooltip>
      <Text
        size="sm"
        fw={600}
        ta="center"
        miw={24}
        c={upvoted ? "red" : downvoted ? "blue" : undefined}
        aria-label={scoreLabel}
      >
        {score}
      </Text>
      <MaybeTooltip label={canVote ? downvoteLabel : undefined}>
        <ActionIcon
          variant={downvoted ? "light" : "subtle"}
          color={downvoted ? "blue" : "gray"}
          size={controlSize}
          aria-label={downvoteLabel}
          aria-pressed={downvoted}
          loading={pending && pendingDirection === -1}
          disabled={!canVote || pending}
          onClick={() => onCastVote(-1)}
        >
          {downvoted ? <IconArrowBigDownFilled size={iconSize} /> : <IconArrowBigDown size={iconSize} stroke={1.5} />}
        </ActionIcon>
      </MaybeTooltip>
    </Group>
  );

  return canVote ? controls : <Tooltip label={signInHint}>{controls}</Tooltip>;
}

const MaybeTooltip = ({ label, children }: { label: string | undefined; children: ReactElement }) =>
  label ? <Tooltip label={label}>{children}</Tooltip> : children;
