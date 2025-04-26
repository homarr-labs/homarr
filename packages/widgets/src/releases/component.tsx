"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Divider, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import {
  IconArchive,
  IconCircleDot,
  IconCircleFilled,
  IconExternalLink,
  IconGitFork,
  IconProgressCheck,
  IconStar,
} from "@tabler/icons-react";
import combineClasses from "clsx";
import { useFormatter, useNow } from "next-intl";
import ReactMarkdown from "react-markdown";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";
import { Providers } from "./releases-providers";
import type { ReleasesRepository } from "./releases-repository";

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
  const hasIconColor = useMemo(() => board.iconColor !== null, [board.iconColor]);

  const [results] = clientApi.widget.releases.getLatest.useSuspenseQuery(
    {
      repositories: options.repositories.map((repository) => ({
        providerKey: repository.providerKey,
        identifier: repository.identifier,
        versionFilter: repository.versionFilter,
      })),
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const repositories = useMemo(() => {
    return results
      .map(({ data }) => {
        if (data === undefined) return undefined;

        const repository = options.repositories.find(
          (repository: ReleasesRepository) =>
            repository.providerKey === data.providerKey && repository.identifier === data.identifier,
        );

        if (repository === undefined) return undefined;

        return {
          ...repository,
          ...data,
          isNewRelease:
            options.newReleaseWithin !== "" ? isDateWithin(data.latestReleaseAt, options.newReleaseWithin) : false,
          isStaleRelease:
            options.staleReleaseWithin !== "" ? !isDateWithin(data.latestReleaseAt, options.staleReleaseWithin) : false,
        };
      })
      .filter(
        (repository) =>
          repository !== undefined &&
          (!options.showOnlyHighlighted || repository.isNewRelease || repository.isStaleRelease),
      )
      .sort((repoA, repoB) => {
        if (repoA?.latestReleaseAt === undefined) return 1;
        if (repoB?.latestReleaseAt === undefined) return -1;
        return repoA.latestReleaseAt > repoB.latestReleaseAt ? -1 : 1;
      }) as ReleasesRepository[];
  }, [
    results,
    options.repositories,
    options.showOnlyHighlighted,
    options.newReleaseWithin,
    options.staleReleaseWithin,
  ]);

  const toggleExpandedRepository = useCallback(
    (identifier: string) => {
      setExpandedRepository(expandedRepository === identifier ? "" : identifier);
    },
    [expandedRepository],
  );

  return (
    <Stack gap={0}>
      {repositories.map((repository: ReleasesRepository) => {
        const isActive = expandedRepository === repository.identifier;

        return (
          <Stack
            key={`${repository.providerKey}.${repository.identifier}`}
            className={classes.releasesRepository}
            gap={0}
          >
            <Group
              className={combineClasses(classes.releasesRepositoryHeader, {
                [classes.active ?? ""]: isActive,
              })}
              p="xs"
              onClick={() => toggleExpandedRepository(repository.identifier)}
            >
              <MaskedOrNormalImage
                imageUrl={repository.iconUrl ?? Providers[repository.providerKey]?.iconUrl}
                hasColor={hasIconColor}
                style={{
                  width: "1em",
                  aspectRatio: "1/1",
                }}
              />

              <Group gap={5} justify="space-between" style={{ flex: 1}}>
                <Text size="xs">{repository.identifier}</Text>

                <Tooltip label={repository.latestRelease ?? t("not-found")}>
                  <Text size="xs" fw={700} truncate="end" style={{ flexShrink: 1 }}>
                    {repository.latestRelease ?? t("not-found")}
                  </Text>
                </Tooltip>
              </Group>

              <Group gap={5} >
                <Text
                  size="xs"
                  c={repository.isNewRelease ? "primaryColor" : repository.isStaleRelease ? "secondaryColor" : "dimmed"}
                >
                  {repository.latestReleaseAt &&
                    formatter.relativeTime(repository.latestReleaseAt, {
                      now,
                      style: "narrow",
                    })}
                </Text>
                {(repository.isNewRelease || repository.isStaleRelease) && (
                  <IconCircleFilled
                    size={10}
                    color={
                      repository.isNewRelease
                        ? "var(--mantine-color-primaryColor-filled)"
                        : "var(--mantine-color-secondaryColor-filled)"
                    }
                  />
                )}
              </Group>
            </Group>
            {options.showDetails && (
              <DetailsDisplay repository={repository} toggleExpandedRepository={toggleExpandedRepository} />
            )}
            {isActive && <ExpandedDisplay repository={repository} hasIconColor={hasIconColor} />}
            <Divider />
          </Stack>
        );
      })}
    </Stack>
  );
}

interface DetailsDisplayProps {
  repository: ReleasesRepository;
  toggleExpandedRepository: (identifier: string) => void;
}

const DetailsDisplay = ({ repository, toggleExpandedRepository }: DetailsDisplayProps) => {
  const t = useScopedI18n("widget.releases");
  const formatter = useFormatter();

  return (
    <>
      <Divider onClick={() => toggleExpandedRepository(repository.identifier)} />
      <Group
        className={classes.releasesRepositoryDetails}
        justify="space-between"
        p={5}
        onClick={() => toggleExpandedRepository(repository.identifier)}
      >
        <Group>
          <Tooltip label={t("pre-release")}>
            <IconProgressCheck
              size={13}
              color={
                repository.isPreRelease ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"
              }
            />
          </Tooltip>

          <Tooltip label={t("archived")}>
            <IconArchive
              size={13}
              color={repository.isArchived ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>

          <Tooltip label={t("forked")}>
            <IconGitFork
              size={13}
              color={repository.isFork ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>
        </Group>
        <Group>
          <Tooltip label={t("starsCount")}>
            <Group gap={5}>
              <IconStar
                size={12}
                color={repository.starsCount === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={repository.starsCount === 0 ? "dimmed" : ""}>
                {repository.starsCount === 0
                  ? "-"
                  : formatter.number(repository.starsCount ?? 0, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("forksCount")}>
            <Group gap={5}>
              <IconGitFork
                size={12}
                color={repository.forksCount === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={repository.forksCount === 0 ? "dimmed" : ""}>
                {repository.forksCount === 0
                  ? "-"
                  : formatter.number(repository.forksCount ?? 0, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("issuesCount")}>
            <Group gap={5}>
              <IconCircleDot
                size={12}
                color={repository.openIssues === 0 ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={repository.openIssues === 0 ? "dimmed" : ""}>
                {repository.openIssues === 0
                  ? "-"
                  : formatter.number(repository.openIssues ?? 0, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>
        </Group>
      </Group>
    </>
  );
};

interface ExtendedDisplayProps {
  repository: ReleasesRepository;
  hasIconColor: boolean;
}

const ExpandedDisplay = ({ repository, hasIconColor }: ExtendedDisplayProps) => {
  const t = useScopedI18n("widget.releases");
  const now = useNow();
  const formatter = useFormatter();

  return (
    <>
      <Divider mx={5} />
      <Stack className={classes.releasesRepositoryExpanded} gap={0} p={10}>
        <Group justify="space-between" align="center">
          <Group gap={5} align="center">
            <MaskedOrNormalImage
              imageUrl={Providers[repository.providerKey]?.iconUrl}
              hasColor={hasIconColor}
              style={{
                width: "1em",
                aspectRatio: "1/1",
              }}
            />
            <Text size="xs" c="iconColor" ff="monospace">
              {Providers[repository.providerKey]?.name}
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
          {repository.releaseUrl ? t("openReleasePage") : t("openProjectPage")}
        </Button>
        {repository.releaseDescription && (
          <>
            <Divider my={10} mx="30%" />
            <Title order={4} ta="center">
              {t("releaseDescription")}
            </Title>
            <Text component="div" size="xs" ff="monospace">
              <ReactMarkdown skipHtml>{repository.releaseDescription}</ReactMarkdown>
            </Text>
          </>
        )}
      </Stack>
    </>
  );
};
