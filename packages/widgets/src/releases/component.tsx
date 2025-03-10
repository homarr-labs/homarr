"use client";

import { Divider, Grid, Group, Stack, Text } from "@mantine/core";
import { useFormatter } from "next-intl";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";
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

  return (
    <Stack>
      <Stack gap={2}>
        {repositories.map((repository: ReleaseRepository) => (
          <Stack key={`${repository.provider.name}.${repository.identifier}`} gap={5}>
            <Grid columns={2} p="xs" gutter="xs" align="center">
              <Grid.Col span="content">
                <MaskedOrNormalImage
                  imageUrl={repository.iconUrl ?? repository.provider.iconUrl}
                  hasColor={board.iconColor !== null}
                  style={{
                    height: "1.7em",
                    width: "1.7em",
                  }}
                />
              </Grid.Col>
              <Grid.Col span="auto">
                <Grid className={classes.card} p={0} gutter="xs">
                  <Grid.Col span={8} p={0}>
                    <Text truncate="end" size="sm">
                      {repository.identifier}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={4} p={0}>
                    <Text
                      size="sm"
                      fw={700}
                      c="primaryColor"
                      style={{
                        textAlign: "right",
                      }}
                    >
                      {repository.latestRelease ?? t("not-found")}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8} p={0}>
                    <Group gap={5}>
                      <MaskedOrNormalImage
                        imageUrl={repository.provider.iconUrl}
                        color="dimmed"
                        hasColor={true}
                        style={{
                          height: "0.8em",
                          width: "0.8em",
                        }}
                      />
                      <Text c="dimmed" size="xs">
                        {repository.provider.name}
                      </Text>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={4} p={0}>
                    <Group justify="end" gap={5}>
                      <Text
                        size="sm"
                        style={{
                          textAlign: "right",
                        }}
                      >
                        {repository.latestReleaseDate &&
                          formatter.relativeTime(repository.latestReleaseDate, {
                            style: "narrow",
                          })}
                      </Text>
                      {repository.shouldHighlight && (
                        <Text c="dimmed" fw={600}>
                          !
                        </Text>
                      )}
                    </Group>
                  </Grid.Col>
                </Grid>
              </Grid.Col>
            </Grid>
            <Divider />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
