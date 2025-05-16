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
  IconTriangleFilled,
} from "@tabler/icons-react";
import combineClasses from "clsx";
import { useFormatter, useNow } from "next-intl";
import ReactMarkdown from "react-markdown";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { isDateWithin, splitToChunksWithNItems } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";
import { Providers } from "./releases-providers";
import type { ReleasesRepositoryResponse } from "./releases-repository";

const formatRelativeDate = (value: string): string => {
  const isMonths = /\d+m/g.test(value);
  const isOtherUnits = /\d+[HDWY]/g.test(value);
  return isMonths ? value.toUpperCase() : isOtherUnits ? value.toLowerCase() : value;
};

export default function ReleasesWidget({ options }: WidgetComponentProps<"releases">) {
  const t = useScopedI18n("widget.releases");
  const now = useNow();
  const formatter = useFormatter();
  const board = useRequiredBoard();
  const [expandedRepository, setExpandedRepository] = useState({ providerKey: "", identifier: "" });
  const hasIconColor = useMemo(() => board.iconColor !== null, [board.iconColor]);
  const relativeDateOptions = useMemo(
    () => ({
      newReleaseWithin: formatRelativeDate(options.newReleaseWithin),
      staleReleaseWithin: formatRelativeDate(options.staleReleaseWithin),
    }),
    [options.newReleaseWithin, options.staleReleaseWithin],
  );

  const batchedRepositories = useMemo(() => splitToChunksWithNItems(options.repositories, 5), [options.repositories]);
  const [results] = clientApi.useSuspenseQueries((t) =>
    batchedRepositories.flatMap((chunk) =>
      t.widget.releases.getLatest({
        repositories: chunk.map((repository) => ({
          providerKey: repository.providerKey,
          identifier: repository.identifier,
          versionFilter: repository.versionFilter,
        })),
      }),
    ),
  );

  const repositories = useMemo(() => {
    const formattedResults = results
      .flat()
      .map(({ data }) => {
        if (data === undefined) return undefined;

        const repository = options.repositories.find(
          (repository) => repository.providerKey === data.providerKey && repository.identifier === data.identifier,
        );

        if (repository === undefined) return undefined;

        return {
          ...repository,
          ...data,
          isNewRelease:
            relativeDateOptions.newReleaseWithin !== "" && data.latestReleaseAt
              ? isDateWithin(data.latestReleaseAt, relativeDateOptions.newReleaseWithin)
              : false,
          isStaleRelease:
            relativeDateOptions.staleReleaseWithin !== "" && data.latestReleaseAt
              ? !isDateWithin(data.latestReleaseAt, relativeDateOptions.staleReleaseWithin)
              : false,
        };
      })
      .filter(
        (repository) =>
          repository !== undefined &&
          (repository.error !== undefined ||
            !options.showOnlyHighlighted ||
            repository.isNewRelease ||
            repository.isStaleRelease),
      )
      .sort((repoA, repoB) => {
        if (repoA?.latestReleaseAt === undefined) return 1;
        if (repoB?.latestReleaseAt === undefined) return -1;
        return repoA.latestReleaseAt > repoB.latestReleaseAt ? -1 : 1;
      }) as ReleasesRepositoryResponse[];

    if (typeof options.topReleases !== "string" && options.topReleases > 0) {
      return formattedResults.slice(0, options.topReleases);
    }

    return formattedResults;
  }, [
    results,
    options.repositories,
    options.showOnlyHighlighted,
    options.topReleases,
    relativeDateOptions.newReleaseWithin,
    relativeDateOptions.staleReleaseWithin,
  ]);

  const toggleExpandedRepository = useCallback(
    (repository: ReleasesRepositoryResponse) => {
      if (
        expandedRepository.providerKey === repository.providerKey &&
        expandedRepository.identifier === repository.identifier
      ) {
        setExpandedRepository({ providerKey: "", identifier: "" });
      } else {
        setExpandedRepository({ providerKey: repository.providerKey, identifier: repository.identifier });
      }
    },
    [expandedRepository],
  );

  return (
    <Stack gap={0}>
      {repositories.map((repository: ReleasesRepositoryResponse) => {
        const isActive =
          expandedRepository.providerKey === repository.providerKey &&
          expandedRepository.identifier === repository.identifier;
        const hasError = repository.error !== undefined;

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
              onClick={() => toggleExpandedRepository(repository)}
            >
              <MaskedOrNormalImage
                imageUrl={repository.iconUrl ?? Providers[repository.providerKey].iconUrl}
                hasColor={hasIconColor}
                style={{
                  width: "1em",
                  aspectRatio: "1/1",
                }}
              />

              <Group gap={5} justify="space-between" style={{ flex: 1 }}>
                {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                <Text size="xs">{repository.name || repository.identifier}</Text>

                <Tooltip
                  withArrow
                  arrowSize={5}
                  label={repository.latestRelease}
                  events={{ hover: repository.latestRelease !== undefined, focus: false, touch: false }}
                >
                  <Text size="xs" fw={700} truncate="end" c={hasError ? "red" : "text"} style={{ flexShrink: 1 }}>
                    {hasError ? t("error.label") : (repository.latestRelease ?? t("not-found"))}
                  </Text>
                </Tooltip>
              </Group>

              <Group gap={5}>
                <Text
                  size="xs"
                  c={repository.isNewRelease ? "primaryColor" : repository.isStaleRelease ? "secondaryColor" : "dimmed"}
                >
                  {repository.latestReleaseAt &&
                    !hasError &&
                    formatter.relativeTime(repository.latestReleaseAt, {
                      now,
                      style: "narrow",
                    })}
                </Text>
                {!hasError ? (
                  (repository.isNewRelease || repository.isStaleRelease) && (
                    <IconCircleFilled
                      size={10}
                      color={
                        repository.isNewRelease
                          ? "var(--mantine-color-primaryColor-filled)"
                          : "var(--mantine-color-secondaryColor-filled)"
                      }
                    />
                  )
                ) : (
                  <IconTriangleFilled size={10} color={"var(--mantine-color-red-filled)"} />
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
  repository: ReleasesRepositoryResponse;
  toggleExpandedRepository: (repository: ReleasesRepositoryResponse) => void;
}

const DetailsDisplay = ({ repository, toggleExpandedRepository }: DetailsDisplayProps) => {
  const t = useScopedI18n("widget.releases");
  const formatter = useFormatter();

  return (
    <>
      <Divider onClick={() => toggleExpandedRepository(repository)} />
      <Group
        className={classes.releasesRepositoryDetails}
        justify="space-between"
        p={5}
        onClick={() => toggleExpandedRepository(repository)}
      >
        <Group>
          <Tooltip label={t("pre-release")} withArrow arrowSize={5}>
            <IconProgressCheck
              size={13}
              color={
                repository.isPreRelease ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"
              }
            />
          </Tooltip>

          <Tooltip label={t("archived")} withArrow arrowSize={5}>
            <IconArchive
              size={13}
              color={repository.isArchived ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>

          <Tooltip label={t("forked")} withArrow arrowSize={5}>
            <IconGitFork
              size={13}
              color={repository.isFork ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>
        </Group>
        <Group>
          <Tooltip label={t("starsCount")} withArrow arrowSize={5}>
            <Group gap={5}>
              <IconStar
                size={12}
                color={!repository.starsCount ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={!repository.starsCount ? "dimmed" : ""}>
                {!repository.starsCount
                  ? "-"
                  : formatter.number(repository.starsCount, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("forksCount")} withArrow arrowSize={5}>
            <Group gap={5}>
              <IconGitFork
                size={12}
                color={!repository.forksCount ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={!repository.forksCount ? "dimmed" : ""}>
                {!repository.forksCount
                  ? "-"
                  : formatter.number(repository.forksCount, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("issuesCount")} withArrow arrowSize={5}>
            <Group gap={5}>
              <IconCircleDot
                size={12}
                color={!repository.openIssues ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text size="xs" c={!repository.openIssues ? "dimmed" : ""}>
                {!repository.openIssues
                  ? "-"
                  : formatter.number(repository.openIssues, {
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
  repository: ReleasesRepositoryResponse;
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
              imageUrl={Providers[repository.providerKey].iconUrl}
              hasColor={hasIconColor}
              style={{
                width: "1em",
                aspectRatio: "1/1",
              }}
            />
            <Text size="xs" c="iconColor" ff="monospace">
              {Providers[repository.providerKey].name}
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

        <Text size="xs" c="iconColor" ff="monospace">
          {repository.identifier}
        </Text>

        {(repository.releaseUrl ?? repository.projectUrl) && (
          <>
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
          </>
        )}
        {repository.error && (
          <>
            <Divider my={10} mx="30%" />
            <Title order={4} ta="center">
              {t("error.label")}
            </Title>
            <Text size="xs" ff="monospace" c="red" style={{ whiteSpace: "pre-wrap" }}>
              {repository.error.code ? t(`error.options.${repository.error.code}` as never) : repository.error.message}
            </Text>
          </>
        )}
        {repository.releaseDescription && (
          <>
            <Divider my={10} mx="30%" />
            <Title order={4} ta="center">
              {t("releaseDescription")}
            </Title>
            <Text component="div" size="xs" ff="monospace" className={classes.releasesDescription}>
              <ReactMarkdown skipHtml>{repository.releaseDescription}</ReactMarkdown>
            </Text>
          </>
        )}
      </Stack>
    </>
  );
};
