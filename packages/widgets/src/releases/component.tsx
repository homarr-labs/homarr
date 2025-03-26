"use client";

import { useState } from "react";
import { Button, Divider, Grid, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconArchive, IconCircleDot, IconExternalLink, IconGitFork, IconRocket, IconStar } from "@tabler/icons-react";
import combineClasses from "clsx";
import { useFormatter, useNow } from "next-intl";
import ReactMarkdown from "react-markdown";

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
  const now = useNow();
  const formatter = useFormatter();
  const board = useRequiredBoard();
  const [expandedRepository, setExpandedRepository] = useState("");

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

    Object.assign(repository, {
      ...data,
      shouldHighlight:
        options.highlightWithin !== "" ? isDateWithin(data.latestReleaseAt, options.highlightWithin) : false,
    });
  }

  const repositories = options.showOnlyNewReleases
    ? options.repositories.filter((repository) => repository.shouldHighlight)
    : options.repositories;

  if (options.sortBy === "releaseDate") {
    repositories.sort((repoA, repoB) => {
      if (repoA.latestReleaseAt === undefined) return 1;
      if (repoB.latestReleaseAt === undefined) return -1;
      return repoA.latestReleaseAt > repoB.latestReleaseAt ? -1 : 1;
    });

    return (
      <Stack gap={0}>
        {repositories.map((repository: ReleaseRepository) => (
          <Stack
            key={`${repository.provider.name}.${repository.identifier}`}
            className={classes.releasesRepository}
            gap={0}
          >
            <Grid
              className={combineClasses(classes.releasesRepositoryHeader, {
                [classes.active ?? ""]: expandedRepository === repository.identifier,
              })}
              columns={17}
              p="xs"
              gutter="xs"
              justify="stretch"
              align="center"
              onClick={() =>
                setExpandedRepository(expandedRepository === repository.identifier ? "" : repository.identifier)
              }
            >
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
              <Grid.Col span={6.8} p={0}>
                <Text truncate="end" size="xs">
                  {repository.identifier}
                </Text>
              </Grid.Col>
              <Grid.Col span={5} p={0}>
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
                  {repository.latestReleaseAt &&
                    formatter.relativeTime(repository.latestReleaseAt, {
                      now,
                      style: "narrow",
                    })}
                </Text>
              </Grid.Col>
            </Grid>
            {options.showDetails && (
              <>
                <Divider mx={5} />
                <Grid
                  className={classes.releasesRepositoryDetails}
                  gutter="xs"
                  align="center"
                  py={5}
                  px={10}
                  onClick={() =>
                    setExpandedRepository(expandedRepository === repository.identifier ? "" : repository.identifier)
                  }
                >
                  <Grid.Col span={4.5}>
                    <Group gap={5}>
                      <Tooltip label={t("pre-release")}>
                        <IconRocket
                          size={13}
                          color={
                            repository.isPreRelease
                              ? "var(--mantine-color-secondaryColor-text)"
                              : "var(--mantine-color-dimmed)"
                          }
                        />
                      </Tooltip>
                      <Tooltip label={t("archived")}>
                        <IconArchive
                          size={13}
                          color={
                            repository.isArchived
                              ? "var(--mantine-color-secondaryColor-text)"
                              : "var(--mantine-color-dimmed)"
                          }
                        />
                      </Tooltip>
                      <Tooltip label={t("forked")}>
                        <IconGitFork
                          size={13}
                          color={
                            repository.isFork
                              ? "var(--mantine-color-secondaryColor-text)"
                              : "var(--mantine-color-dimmed)"
                          }
                        />
                      </Tooltip>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={2.5}>
                    <Tooltip label={t("starsCount")}>
                      <Group gap={5}>
                        <IconStar
                          size={12}
                          color={
                            repository.starsCount === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"
                          }
                        />
                        <Text size="xs" c={repository.starsCount === 0 ? "dimmed" : ""}>
                          {repository.starsCount === 0 ? "-" : repository.starsCount}
                        </Text>
                      </Group>
                    </Tooltip>
                  </Grid.Col>
                  <Grid.Col span={2.5}>
                    <Tooltip label={t("forksCount")}>
                      <Group gap={5}>
                        <IconGitFork
                          size={12}
                          color={
                            repository.forksCount === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"
                          }
                        />
                        <Text size="xs" c={repository.forksCount === 0 ? "dimmed" : ""}>
                          {repository.forksCount === 0 ? "-" : repository.forksCount}
                        </Text>
                      </Group>
                    </Tooltip>
                  </Grid.Col>
                  <Grid.Col span={2.5}>
                    <Tooltip label={t("issuesCount")}>
                      <Group gap={5}>
                        <IconCircleDot
                          size={12}
                          color={
                            repository.openIssues === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"
                          }
                        />
                        <Text size="xs" c={repository.openIssues === 0 ? "dimmed" : ""}>
                          {repository.openIssues === 0 ? "-" : repository.openIssues}
                        </Text>
                      </Group>
                    </Tooltip>
                  </Grid.Col>
                </Grid>
              </>
            )}
            {expandedRepository === repository.identifier && (
              <>
                <Divider mx={5} />
                <Stack className={classes.releasesRepositoryExpanded} gap={0} p={10}>
                  <Group justify="space-between" align="center">
                    <Group gap={5} align="center">
                      <MaskedOrNormalImage
                        imageUrl={repository.provider.iconUrl}
                        hasColor={board.iconColor !== null}
                        style={{
                          width: "1em",
                          aspectRatio: "1/1",
                        }}
                      />
                      <Text size="xs" c="iconColor" ff="monospace">
                        {repository.provider.name}
                      </Text>
                    </Group>
                    {repository.createdAt && (
                      <Text size="xs" c="dimmed" ff="monospace">
                        <Text span>{t("created")}</Text>
                        <Text span> | </Text>
                        <Text span fw={700}>
                          {formatter.relativeTime(repository.createdAt, {
                            now,
                            style: "narrow",
                          })}
                        </Text>
                      </Text>
                    )}
                  </Group>
                  <Divider my={10} mx="30%" />
                  <Button
                    variant="light"
                    component="a"
                    href={repository.releaseUrl ?? repository.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconExternalLink />
                    {t("openProjectPage")}
                  </Button>
                  {repository.releaseDescription && (
                    <>
                      <Divider my={10} mx="30%" />
                      <Title order={4} ta="center">
                        {t("releaseDescription")}
                      </Title>
                      <Text component="div" size="xs" ff="monospace">
                        <ReactMarkdown
                          skipHtml={true}
                          components={{
                            a: ({ ...props }) => <span>{props.children}</span>,
                          }}
                        >
                          {repository.releaseDescription}
                        </ReactMarkdown>
                      </Text>
                    </>
                  )}
                </Stack>
              </>
            )}
            <Divider />
          </Stack>
        ))}
      </Stack>
    );
  }
}
