"use client";

import { Divider, Grid, Stack, Text } from "@mantine/core";
import { useFormatter, useNow } from "next-intl";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
// import classes from "./component.module.scss";
import type { ReleaseRepository } from "./release-repository";

function isDateWithin(date: Date, relativeDate: string): boolean {
  const amount = parseInt(relativeDate.slice(0, -1), 10);
  const unit = relativeDate.slice(-1);

  const startTime = new Date().getTime();
  const endTime = new Date(date).getTime();
  const diffTime = Math.abs(endTime - startTime);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  switch (unit) {
    case "h":
      return diffHours < amount;

    case "d":
      return diffHours / 24 < amount;

    case "w":
      return diffHours / (24 * 7) < amount;

    case "m":
      return diffHours / (24 * 30) < amount;

    case "y":
      return diffHours / (24 * 365) < amount;

    default:
      throw new Error("Invalid unit");
  }
}

export default function ReleasesWidget({ options }: WidgetComponentProps<"releases">) {
  const t = useScopedI18n("widget.releases");
  const now = useNow();
  const formatter = useFormatter();
  const board = useRequiredBoard();

  const [results] = clientApi.widget.releases.getLatest.useSuspenseQuery(
    {
      repositories: options.repositories.map((repository) => ({
        providerName: repository.provider.name,
        identifier: repository.identifier,
        versionRegex: repository.versionRegex,
      })),
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  for (const { data } of results) {
    if (data === undefined) continue;

    const repository = options.repositories.find(
      (repository: ReleaseRepository) => repository.identifier === data.identifier,
    );

    if (repository === undefined) continue;

    repository.latestRelease = data.tag;
    repository.latestReleaseDate = data.lastUpdated;
    repository.shouldHighlight =
      options.highlightWithin !== "" ? isDateWithin(repository.latestReleaseDate, options.highlightWithin) : false;
  }

  const repositories = options.showOnlyNewReleases
    ? options.repositories.filter((repository) => repository.shouldHighlight)
    : options.repositories;

  if (options.sortBy === "releaseDate") {
    repositories.sort((a, b) => {
      if (a.latestReleaseDate === undefined) return 1;
      if (b.latestReleaseDate === undefined) return -1;
      return a.latestReleaseDate > b.latestReleaseDate ? -1 : 1;
    });

    return (
      <Stack>
        <Stack gap={2}>
          {repositories.map((repository: ReleaseRepository) => (
            <Stack key={`${repository.provider.name}.${repository.identifier}`} gap={0}>
              <Grid columns={17} p={5} gutter="xs" justify="stretch" align="center">
                <Grid.Col span={1.2}>
                  <MaskedOrNormalImage
                    imageUrl={repository.iconUrl ?? repository.provider.iconUrl}
                    hasColor={board.iconColor !== null}
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={6} p={0}>
                  <Text truncate="end" size="xs">
                    {repository.identifier}
                  </Text>
                </Grid.Col>
                <Grid.Col span={5.8} p={0}>
                  <Text
                    size="xs"
                    fw={700}
                    style={{
                      textAlign: "right",
                    }}
                  >
                    {repository.latestRelease ?? t("not-found")}
                  </Text>
                </Grid.Col>
                <Grid.Col span={1} p={0}>
                  {repository.shouldHighlight && (
                    <Text c="primaryColor" fw={600} style={{ textAlign: "center" }}>
                      !
                    </Text>
                  )}
                </Grid.Col>
                <Grid.Col span={3} p={0}>
                  <Text size="xs" c="dimmed">
                    {repository.latestReleaseDate &&
                      formatter.relativeTime(repository.latestReleaseDate, {
                        now,
                        style: "narrow",
                      })}
                  </Text>
                </Grid.Col>
              </Grid>
              <Divider />
            </Stack>
          ))}
        </Stack>
      </Stack>
    );
  }
}
