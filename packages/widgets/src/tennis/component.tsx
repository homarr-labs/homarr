"use client";

import { Badge, Box, Center, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconBallTennis } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";

type TennisMatch = RouterOutputs["widget"]["tennis"]["getMatches"]["data"]["matches"][number];

type TennisPlayer = TennisMatch["players"][number];

const formatScheduledTime = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
};

interface PlayerRowProps {
  player: TennisPlayer;
  isLive: boolean;
  showRanking: boolean;
  hasWon: boolean;
}

const PlayerRow = ({ player, isLive, showRanking, hasWon }: PlayerRowProps) => (
  <Group gap="xs" wrap="nowrap" justify="space-between">
    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
      <Box
        w={6}
        h={6}
        style={{ borderRadius: "50%", flexShrink: 0 }}
        bg={isLive && player.isServing ? "yellow.6" : "transparent"}
      />
      <Text size="sm" fw={hasWon ? 700 : 400} truncate="end">
        {player.name}
      </Text>
      {player.country && (
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          {player.country}
        </Text>
      )}
      {showRanking && player.ranking !== null && (
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          #{player.ranking}
        </Text>
      )}
    </Group>

    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
      {player.games.map((games, index) => (
        <Text key={index} size="sm" ff="monospace" c={index === player.games.length - 1 ? undefined : "dimmed"}>
          {games}
        </Text>
      ))}
      {isLive && (
        <Text size="sm" ff="monospace" fw={700} w={24} ta="right">
          {player.points ?? "-"}
        </Text>
      )}
    </Group>
  </Group>
);

export default function TennisWidget({ options, width }: WidgetComponentProps<"tennis">) {
  const t = useScopedI18n("widget.tennis");
  const { data: result } = clientApi.widget.tennis.getMatches.useQuery(options);

  if (!result) return <WidgetEmptyState />;

  const { matches } = result.data;

  if (matches.length === 0) {
    return (
      <Center h="100%" w="100%" p="sm">
        <Stack align="center" gap={4}>
          <IconBallTennis size={28} opacity={0.5} />
          <Text c="dimmed" size="sm" ta="center">
            {t("noMatches")}
          </Text>
        </Stack>
      </Center>
    );
  }

  const showDetails = width > 260;

  return (
    <ScrollArea h="100%" w="100%" type="hover">
      <Stack gap="xs" p="xs">
        {matches.map((match) => {
          const isLive = match.status === "live";
          const [playerOne, playerTwo] = match.players;
          const scheduledTime = formatScheduledTime(match.scheduledTime);

          return (
            <Stack key={match.id} gap={2}>
              <Group gap="xs" justify="space-between" wrap="nowrap">
                {options.showTournament && match.tournament && (
                  <Text size="xs" c="dimmed" truncate="end">
                    {match.tournament}
                  </Text>
                )}
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                  {showDetails && match.surface && (
                    <Text size="xs" c="dimmed">
                      {match.surface}
                    </Text>
                  )}
                  {isLive ? (
                    <Badge size="xs" color="red" variant="light">
                      {t("status.live")}
                    </Badge>
                  ) : (
                    scheduledTime && (
                      <Text size="xs" c="dimmed">
                        {scheduledTime}
                      </Text>
                    )
                  )}
                </Group>
              </Group>

              <PlayerRow
                player={playerOne}
                isLive={isLive}
                showRanking={options.showRanking}
                hasWon={match.status === "completed" && playerOne.sets > playerTwo.sets}
              />
              <PlayerRow
                player={playerTwo}
                isLive={isLive}
                showRanking={options.showRanking}
                hasWon={match.status === "completed" && playerTwo.sets > playerOne.sets}
              />
            </Stack>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
