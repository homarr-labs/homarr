"use client";

import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconArrowBigDown, IconArrowBigDownFilled, IconArrowBigUp, IconArrowBigUpFilled } from "@tabler/icons-react";

import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopBackend } from "@homarr/workshop/backend";
import { useWorkshopUserVotesQuery, useWorkshopVoteMutation } from "@homarr/workshop/backend";

interface WorkshopVoteControlProps {
  client: WorkshopBackend;
  submissionId: string;
  score: number;
  /** Voting requires a Workshop account; installing does not. */
  canVote: boolean;
  size?: "sm" | "md";
}

/**
 * Upvote / net score / downvote. The user's own vote is filled and coloured,
 * and clicking it again removes the vote.
 */
export function WorkshopVoteControl({ client, submissionId, score, canVote, size = "md" }: WorkshopVoteControlProps) {
  const t = useScopedI18n("workshop");
  const vote = useWorkshopVoteMutation(client);
  const userVotes = useWorkshopUserVotesQuery(client);
  const ownVote = userVotes.data?.find((entry) => entry.submission === submissionId)?.value ?? null;

  const castVote = (value: 1 | -1) =>
    vote.mutate(
      { submission: submissionId, value },
      { onError: (error) => showErrorNotification({ title: t("voteError"), message: error.message }) },
    );

  const iconSize = size === "sm" ? 16 : 18;
  const controlSize = size === "sm" ? "sm" : "md";
  const upvoted = ownVote === 1;
  const downvoted = ownVote === -1;

  const controls = (
    <Group gap={2} wrap="nowrap">
      <MaybeTooltip label={canVote ? t("upvote") : undefined}>
        <ActionIcon
          variant={upvoted ? "light" : "subtle"}
          color={upvoted ? "red" : "gray"}
          size={controlSize}
          aria-label={t("upvote")}
          aria-pressed={upvoted}
          loading={vote.isPending && vote.variables?.value === 1}
          disabled={!canVote || vote.isPending}
          onClick={() => castVote(1)}
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
        aria-label={t("score", { count: score })}
      >
        {score}
      </Text>
      <MaybeTooltip label={canVote ? t("downvote") : undefined}>
        <ActionIcon
          variant={downvoted ? "light" : "subtle"}
          color={downvoted ? "blue" : "gray"}
          size={controlSize}
          aria-label={t("downvote")}
          aria-pressed={downvoted}
          loading={vote.isPending && vote.variables?.value === -1}
          disabled={!canVote || vote.isPending}
          onClick={() => castVote(-1)}
        >
          {downvoted ? <IconArrowBigDownFilled size={iconSize} /> : <IconArrowBigDown size={iconSize} stroke={1.5} />}
        </ActionIcon>
      </MaybeTooltip>
    </Group>
  );

  // Tooltips never fire on disabled controls, so when voting is unavailable the
  // hint has to hang off the enabled wrapper instead of the buttons themselves.
  return canVote ? controls : <Tooltip label={t("signInHint")}>{controls}</Tooltip>;
}

const MaybeTooltip = ({ label, children }: { label: string | undefined; children: React.ReactElement }) =>
  label ? <Tooltip label={label}>{children}</Tooltip> : children;
