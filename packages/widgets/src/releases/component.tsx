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
import type { ReleasesRepository, ReleasesRepositoryResponse } from "./releases-repository";

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
  const [expandedRepositoryId, setExpandedRepositoryId] = useState<string | null>(null);
  const hasIconColor = useMemo(() => board.iconColor !== null, [board.iconColor]);
  const relativeDateOptions = useMemo(
    () => ({
      newReleaseWithin: formatRelativeDate(options.newReleaseWithin),
      staleReleaseWithin: formatRelativeDate(options.staleReleaseWithin),
    }),
    [options.newReleaseWithin, options.staleReleaseWithin],
  );

  // Group repositories by integration
  const groupedRepositories = useMemo(() => {
    return options.repositories.reduce(
      (acc, repo) => {
        const key = repo.providerIntegrationId;
        if (!key) return acc;

        acc[key] ??= [];
        acc[key].push(repo);

        return acc;
      },
      {} as Record<string, ReleasesRepository[]>,
    );
  }, [options.repositories]);

  // For each group, split into chunks of 5
  const batchedRepositories = useMemo(() => {
    return Object.entries(groupedRepositories).flatMap(([integrationId, group]) =>
      splitToChunksWithNItems(group, 5).map((chunk) => ({
        integrationId,
        repositories: chunk,
      })),
    );
  }, [groupedRepositories]);

  const [results] = clientApi.useSuspenseQueries((t) =>
    batchedRepositories.flatMap(({ integrationId, repositories }) =>
      t.widget.releases.getLatest({
        integrationId,
        repositories: repositories.map((repository) => ({
          id: repository.id,
          identifier: repository.identifier,
          versionFilter: repository.versionFilter,
        })),
      }),
    ),
  );

  const repositories = useMemo(() => {
    const formattedResults = options.repositories
      .map((repository) => {
        if (repository.providerIntegrationId === undefined) {
          return {
            ...repository,
            isNewRelease: false,
            isStaleRelease: false,
            latestReleaseAt: undefined,
            error: {
              code: "noProviderSeleceted",
            },
          };
        }

        const response = results.flat().find(({ data }) => data.id === repository.id)?.data;

        if (response === undefined)
          return {
            ...repository,
            isNewRelease: false,
            isStaleRelease: false,
            latestReleaseAt: undefined,
            error: {
              code: "noProviderResponse",
            },
          };

        return {
          ...repository,
          ...response,
          isNewRelease:
            relativeDateOptions.newReleaseWithin !== "" && response.latestReleaseAt
              ? isDateWithin(response.latestReleaseAt, relativeDateOptions.newReleaseWithin)
              : false,
          isStaleRelease:
            relativeDateOptions.staleReleaseWithin !== "" && response.latestReleaseAt
              ? !isDateWithin(response.latestReleaseAt, relativeDateOptions.staleReleaseWithin)
              : false,
        };
      })
      .filter(
        (repository) =>
          repository.error !== undefined ||
          !options.showOnlyHighlighted ||
          repository.isNewRelease ||
          repository.isStaleRelease,
      )
      .sort((repoA, repoB) => {
        if (repoA.latestReleaseAt === undefined) return -1;
        if (repoB.latestReleaseAt === undefined) return 1;
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
    (repository: ReleasesRepositoryResponse) =>
      setExpandedRepositoryId(expandedRepositoryId === repository.id ? "" : repository.id),
    [expandedRepositoryId],
  );

  return (
    <Stack gap={0} className="releases">
      {repositories.map((repository: ReleasesRepositoryResponse) => {
        const isActive = expandedRepositoryId === repository.id;
        const hasError = repository.error !== undefined;

        return (
          <Stack
            key={repository.id}
            className={combineClasses(
              "releases-repository",
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              `releases-repository-${repository.integration?.name ?? "error"}-${repository.name || repository.identifier.replace(/[^a-zA-Z0-9]/g, "_")}`,
              classes.releasesRepository,
            )}
            gap={0}
          >
            <Group
              className={combineClasses("releases-repository-header", classes.releasesRepositoryHeader, {
                [classes.active ?? ""]: isActive,
              })}
              p="xs"
              onClick={() => toggleExpandedRepository(repository)}
            >
              <MaskedOrNormalImage
                className="releases-repository-header-icon"
                imageUrl={repository.iconUrl ?? repository.integration?.iconUrl}
                hasColor={hasIconColor}
                style={{
                  width: "1em",
                  aspectRatio: "1/1",
                }}
              />

              <Group
                className="releases-repository-header-nameVersion-wrapper"
                gap={5}
                justify="space-between"
                style={{ flex: 1 }}
              >
                <Text className="releases-repository-header-name" size="xs">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                  {repository.name || repository.identifier}
                </Text>

                <Tooltip
                  className="releases-repository-header-version-tooltip"
                  withArrow
                  arrowSize={5}
                  label={repository.latestRelease}
                  events={{ hover: repository.latestRelease !== undefined, focus: false, touch: false }}
                >
                  <Text
                    className="releases-repository-header-version"
                    size="xs"
                    fw={700}
                    truncate="end"
                    c={hasError ? "red" : "text"}
                    style={{ flexShrink: 1 }}
                  >
                    {hasError ? t("error.label") : (repository.latestRelease ?? t("not-found"))}
                  </Text>
                </Tooltip>
              </Group>

              <Group className="releases-repository-header-releaseDate-wrapper" gap={5}>
                <Text
                  className="releases-repository-header-releaseDate"
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
                      className="releases-repository-header-releaseDate-marker"
                      size={10}
                      color={
                        repository.isNewRelease
                          ? "var(--mantine-color-primaryColor-filled)"
                          : "var(--mantine-color-secondaryColor-filled)"
                      }
                    />
                  )
                ) : (
                  <IconTriangleFilled
                    className="releases-repository-header-releaseDate-error"
                    size={10}
                    color={"var(--mantine-color-red-filled)"}
                  />
                )}
              </Group>
            </Group>
            {options.showDetails && (
              <DetailsDisplay repository={repository} toggleExpandedRepository={toggleExpandedRepository} />
            )}
            {isActive && <ExpandedDisplay repository={repository} hasIconColor={hasIconColor} />}
            <Divider className="releases-repository-divider" />
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
      <Divider className="releases-repository-details-divider" onClick={() => toggleExpandedRepository(repository)} />
      <Group
        className={combineClasses("releases-repository-details", classes.releasesRepositoryDetails)}
        justify="space-between"
        p={5}
        onClick={() => toggleExpandedRepository(repository)}
      >
        <Group className="releases-repository-details-icon-wrapper">
          <Tooltip
            className={combineClasses(
              "releases-repository-details-icon-tooltip",
              "releases-repository-details-icon-preRelease-tooltip",
            )}
            label={t("pre-release")}
            withArrow
            arrowSize={5}
          >
            <IconProgressCheck
              className={combineClasses(
                "releases-repository-details-icon",
                "releases-repository-details-icon-preRelease",
              )}
              size={13}
              color={
                repository.isPreRelease ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"
              }
            />
          </Tooltip>

          <Tooltip
            className={combineClasses(
              "releases-repository-details-icon-tooltip",
              "releases-repository-details-icon-archived-tooltip",
            )}
            label={t("archived")}
            withArrow
            arrowSize={5}
          >
            <IconArchive
              className={combineClasses(
                "releases-repository-details-icon",
                "releases-repository-details-icon-archived",
              )}
              size={13}
              color={repository.isArchived ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>

          <Tooltip
            className={combineClasses(
              "releases-repository-details-icon-tooltip",
              "releases-repository-details-icon-forked-tooltip",
            )}
            label={t("forked")}
            withArrow
            arrowSize={5}
          >
            <IconGitFork
              className={combineClasses("releases-repository-details-icon", "releases-repository-details-icon-forked")}
              size={13}
              color={repository.isFork ? "var(--mantine-color-secondaryColor-text)" : "var(--mantine-color-dimmed)"}
            />
          </Tooltip>
        </Group>
        <Group className="releases-repository-details-stats">
          <Tooltip
            className={combineClasses(
              "releases-repository-details-stats-tooltip",
              "releases-repository-details-stats-stars-tooltip",
            )}
            label={t("starsCount")}
            withArrow
            arrowSize={5}
          >
            <Group
              className={combineClasses(
                "releases-repository-details-stats-wrapper",
                "releases-repository-details-stats-stars-wrapper",
              )}
              gap={5}
            >
              <IconStar
                className={combineClasses(
                  "releases-repository-details-stats-icon",
                  "releases-repository-details-stats-stars-icon",
                )}
                size={12}
                color={!repository.starsCount ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text
                className={combineClasses(
                  "releases-repository-details-stats-text",
                  "releases-repository-details-stats-stars-text",
                )}
                size="xs"
                c={!repository.starsCount ? "dimmed" : ""}
              >
                {!repository.starsCount
                  ? "-"
                  : formatter.number(repository.starsCount, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip
            className={combineClasses(
              "releases-repository-details-stats-tooltip",
              "releases-repository-details-stats-forks-tooltip",
            )}
            label={t("forksCount")}
            withArrow
            arrowSize={5}
          >
            <Group
              className={combineClasses(
                "releases-repository-details-stats-wrapper",
                "releases-repository-details-stats-forks-wrapper",
              )}
              gap={5}
            >
              <IconGitFork
                className={combineClasses(
                  "releases-repository-details-stats-icon",
                  "releases-repository-details-stats-forks-icon",
                )}
                size={12}
                color={!repository.forksCount ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text
                className={combineClasses(
                  "releases-repository-details-stats-text",
                  "releases-repository-details-stats-forks-text",
                )}
                size="xs"
                c={!repository.forksCount ? "dimmed" : ""}
              >
                {!repository.forksCount
                  ? "-"
                  : formatter.number(repository.forksCount, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </Text>
            </Group>
          </Tooltip>

          <Tooltip
            className={combineClasses(
              "releases-repository-details-stats-tooltip",
              "releases-repository-details-stats-issues-tooltip",
            )}
            label={t("issuesCount")}
            withArrow
            arrowSize={5}
          >
            <Group
              className={combineClasses(
                "releases-repository-details-stats-wrapper",
                "releases-repository-details-stats-issues-wrapper",
              )}
              gap={5}
            >
              <IconCircleDot
                className={combineClasses(
                  "releases-repository-details-stats-icon",
                  "releases-repository-details-stats-issues-icon",
                )}
                size={12}
                color={!repository.openIssues ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)"}
              />
              <Text
                className={combineClasses(
                  "releases-repository-details-stats-text",
                  "releases-repository-details-stats-issues-text",
                )}
                size="xs"
                c={!repository.openIssues ? "dimmed" : ""}
              >
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
      <Divider className="releases-repository-expanded-divider" mx={5} />
      <Stack
        className={combineClasses("releases-repository-expanded", classes.releasesRepositoryExpanded)}
        gap="xs"
        p={10}
      >
        <Group className="releases-repository-expanded-header" justify="space-between" align="center" gap="xs">
          <Text className="releases-repository-expanded-header-identifier" size="xs" c="iconColor" ff="monospace">
            {repository.identifier}
          </Text>

          {repository.integration && (
            <Group className="releases-repository-expanded-header-provider-wrapper" gap={5} align="center">
              <MaskedOrNormalImage
                className="releases-repository-expanded-header-provider-icon"
                imageUrl={repository.integration.iconUrl}
                hasColor={hasIconColor}
                style={{
                  width: "1em",
                  aspectRatio: "1/1",
                }}
              />
              <Text
                className="releases-repository-expanded-header-provider-name"
                size="xs"
                c="iconColor"
                ff="monospace"
              >
                {repository.integration.name}
              </Text>
            </Group>
          )}
        </Group>

        {repository.createdAt && (
          <Text className="releases-repository-expanded-createdAt" size="xs" c="dimmed" ff="monospace">
            <Text className="releases-repository-expanded-createdAt-label" span>
              {`${t("created")} | `}
            </Text>
            <Text className="releases-repository-expanded-createdAt-date" span fw={700}>
              {formatter.relativeTime(repository.createdAt, {
                now,
                style: "narrow",
              })}
            </Text>
          </Text>
        )}
        {(repository.releaseUrl ?? repository.projectUrl) && (
          <>
            <Divider className="releases-repository-expanded-openButton-divider" mx="30%" />
            <Button
              className="releases-repository-expanded-openButton"
              variant="light"
              component="a"
              href={repository.releaseUrl ?? repository.projectUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconExternalLink className="releases-repository-expanded-openButton-icon" />
              <Text className="releases-repository-expanded-openButton-text">
                {repository.releaseUrl ? t("openReleasePage") : t("openProjectPage")}
              </Text>
            </Button>
          </>
        )}
        {repository.error && (
          <>
            <Divider className="releases-repository-expanded-error-divider" mx="30%" />
            <Title className="releases-repository-expanded-error-title" order={4} ta="center">
              {t("error.label")}
            </Title>
            <Text
              className="releases-repository-expanded-error-text"
              size="xs"
              ff="monospace"
              c="red"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {repository.error.code ? t(`error.messages.${repository.error.code}` as never) : repository.error.message}
            </Text>
          </>
        )}
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing*/}
        {(repository.releaseDescription || repository.projectDescription) && (
          <>
            <Divider className="releases-repository-expanded-description-divider" my={10} mx="30%" />
            <Title className="releases-repository-expanded-description-title" order={4} ta="center">
              {repository.releaseDescription && repository.releaseDescription !== ""
                ? t("releaseDescription")
                : t("projectDescription")}
            </Title>
            <Text
              className={combineClasses("releases-repository-expanded-description-text", classes.releasesDescription)}
              component="div"
              size="xs"
              ff="monospace"
            >
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing*/}
              <ReactMarkdown skipHtml>{repository.releaseDescription || repository.projectDescription}</ReactMarkdown>
            </Text>
          </>
        )}
      </Stack>
    </>
  );
};
