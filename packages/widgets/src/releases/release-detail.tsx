"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Avatar, Badge, Button, CopyButton, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArchive,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconGitFork,
  IconStar,
} from "@tabler/icons-react";
import { useFormatter } from "next-intl";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { useRequiredBoard } from "@homarr/boards/context";
import { getIconUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage, zoomCompensatedSize } from "@homarr/ui";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.css";
import { hasOutdatedIntegration } from "./display";
import type { IssueGroup } from "./display";
import { truncateVersion } from "./integration-version";
import type { ReleaseEntry } from "./release-entry";

export type DetailLayout = "pane" | "inline";

const markdownComponents: Components = {
  a: ({ href, children }) => {
    const safeHref = getSafeApplicationUrl(href);
    if (!safeHref) return <span>{children}</span>;
    return (
      <a href={safeHref} target="_blank" rel={SAFE_NEW_TAB_REL}>
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    const safeSrc = getSafeApplicationUrl(src);
    if (!safeSrc) return null;
    return <img src={safeSrc} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" />;
  },
};

const describeSource = (entry: ReleaseEntry) => [entry.identifier, entry.provider?.name].filter(Boolean).join(" · ");

const integrationStatusColors = {
  upToDate: "green",
  updateAvailable: "yellow",
  unknownStatus: "gray",
} as const;

const getIntegrationStatus = (isUpToDate: boolean | undefined): keyof typeof integrationStatusColors => {
  if (isUpToDate === undefined) return "unknownStatus";
  if (isUpToDate) return "upToDate";
  return "updateAvailable";
};

const useImageFailed = (url: string | undefined) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    const probe = new Image();
    const handleError = () => setFailedUrl(url);
    probe.addEventListener("error", handleError);
    probe.src = url;
    return () => probe.removeEventListener("error", handleError);
  }, [url]);
  return failedUrl === url;
};

interface EntryIconProps {
  entry: ReleaseEntry;
  size: number;
}

export const EntryIcon = ({ entry, size }: EntryIconProps) => {
  const board = useRequiredBoard();
  const iconUrl = entry.iconUrl ?? entry.provider?.iconUrl;
  const failed = useImageFailed(iconUrl);
  const sizeStyle = zoomCompensatedSize(size);

  if (!iconUrl || failed) {
    return (
      <span
        aria-hidden
        className={classes.fallbackIcon}
        style={{ ...sizeStyle, fontSize: `calc(${size * 0.5}px * var(--board-canvas-ui-scale, 1))` }}
      >
        {entry.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <MaskedOrNormalImage
      imageUrl={iconUrl}
      hasColor={board.iconColor !== null}
      alt=""
      className={classes.icon}
      style={sizeStyle}
    />
  );
};

interface ReleaseDetailProps {
  entry: ReleaseEntry;
  now: Date | null;
  layout: DetailLayout;
  onMarkViewed: (entry: ReleaseEntry) => void;
}

export const ReleaseDetail = ({ entry, now, layout, onMarkViewed }: ReleaseDetailProps) => {
  const t = useI18n("widget.releases");
  const formatter = useFormatter();
  const releaseHref = getSafeApplicationUrl(entry.releaseUrl);
  const projectHref = getSafeApplicationUrl(entry.projectUrl);
  const hasStats = [entry.starsCount, entry.forksCount, entry.openIssues, entry.createdAt].some(
    (value) => value !== undefined,
  );

  return (
    <div className={`releases-detail ${classes.detail}`} data-layout={layout}>
      {layout === "pane" && (
        <div className={classes.detailHead}>
          <EntryIcon entry={entry} size={38} />
          <div className={classes.detailTitle}>
            <div className={classes.detailName}>{entry.name}</div>
            <div className={classes.detailId}>{describeSource(entry)}</div>
          </div>
        </div>
      )}
      {layout === "inline" && <div className={classes.detailId}>{describeSource(entry)}</div>}

      <div className={classes.facts}>
        {entry.version && <span className={classes.factVersion}>{entry.version}</span>}
        {entry.version && (
          <CopyButton value={entry.version}>
            {({ copied, copy }) => (
              <Tooltip label={(copied && t("copied")) || t("copyVersion")} withArrow>
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={copy} aria-label={t("copyVersion")}>
                  {copied && <IconCheck style={zoomCompensatedSize(12)} />}
                  {!copied && <IconCopy style={zoomCompensatedSize(12)} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        )}
        {entry.kind === "new" && (
          <span className={classes.tag} data-tone="new">
            {t("tag.new")}
          </span>
        )}
        {hasOutdatedIntegration(entry) && (
          <span className={classes.tag} data-tone="warn">
            {t("updateAvailable")}
          </span>
        )}
        {entry.isPreRelease && <span className={classes.tag}>{t("tag.preRelease")}</span>}
        {entry.resolvedFromTag && (
          <span className={classes.tag} data-tone="code">
            {t("tag.resolvedFrom", { tag: entry.resolvedFromTag })}
          </span>
        )}
        {entry.kind === "quiet" && <span className={classes.tag}>{t("tag.quiet")}</span>}
        {entry.isArchived && (
          <span className={classes.tag} data-tone="warn">
            <IconArchive style={zoomCompensatedSize(10)} /> {t("tag.archived")}
          </span>
        )}
        {entry.isFork && <span className={classes.tag}>{t("tag.fork")}</span>}
      </div>

      {entry.publishedAt && (
        <div className={classes.when}>
          {t("published", {
            time: [
              now && formatter.relativeTime(entry.publishedAt, now),
              formatter.dateTime(entry.publishedAt, { dateStyle: "medium", timeStyle: "short" }),
            ]
              .filter(Boolean)
              .join(" · "),
          })}
        </div>
      )}

      {entry.projectDescription && <div className={classes.description}>{entry.projectDescription}</div>}

      {entry.integrations.length > 0 && (
        <>
          <div className={classes.label}>{t("runningVersions")}</div>
          <ul className={classes.members}>
            {entry.integrations.map((integration) => {
              const status = getIntegrationStatus(integration.isUpToDate);
              return (
                <li key={integration.id} className={classes.member}>
                  <Avatar src={getIconUrl(integration.kind)} radius="sm" style={zoomCompensatedSize(16)} />
                  <span className={classes.memberName}>{integration.name}</span>
                  <Tooltip
                    label={integration.version}
                    disabled={truncateVersion(integration.version) === integration.version}
                    withArrow
                  >
                    <span className={classes.memberId}>{truncateVersion(integration.version)}</span>
                  </Tooltip>
                  <Badge size="xs" variant="dot" color={integrationStatusColors[status]}>
                    {t(status)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className={classes.label}>{t("whatChanged")}</div>
      {entry.releaseNotes && (
        <div className={classes.notes}>
          <ReactMarkdown skipHtml components={markdownComponents}>
            {entry.releaseNotes}
          </ReactMarkdown>
        </div>
      )}
      {!entry.releaseNotes && (
        <div className={classes.noNotes}>{t("noNotes", { provider: entry.provider?.name ?? "" })}</div>
      )}

      {hasStats && (
        <div className={classes.stats}>
          {entry.starsCount !== undefined && (
            <span className={classes.stat} title={t("starsCount")}>
              <IconStar style={zoomCompensatedSize(12)} />
              {formatter.number(entry.starsCount, { notation: "compact" })}
            </span>
          )}
          {entry.forksCount !== undefined && (
            <span className={classes.stat} title={t("forksCount")}>
              <IconGitFork style={zoomCompensatedSize(12)} />
              {formatter.number(entry.forksCount, { notation: "compact" })}
            </span>
          )}
          {entry.openIssues !== undefined && (
            <span className={classes.stat}>{t("openIssues", { count: entry.openIssues })}</span>
          )}
          {entry.createdAt && now && (
            <span className={classes.stat}>{t("created", { time: formatter.relativeTime(entry.createdAt, now) })}</span>
          )}
        </div>
      )}

      <div className={classes.buttons}>
        {entry.kind === "new" && (
          <Button
            size="compact-sm"
            leftSection={<IconCheck style={zoomCompensatedSize(14)} />}
            onClick={() => onMarkViewed(entry)}
          >
            {t("markViewed")}
          </Button>
        )}
        {entry.isViewed && (
          <span className={classes.viewedNote}>
            <IconCheck style={zoomCompensatedSize(13)} /> {t("viewed")}
          </span>
        )}
        {releaseHref && (
          <Button
            size="compact-sm"
            variant="default"
            component="a"
            href={releaseHref}
            target="_blank"
            rel={SAFE_NEW_TAB_REL}
            leftSection={<IconExternalLink style={zoomCompensatedSize(14)} />}
          >
            {t("releasePage")}
          </Button>
        )}
        {projectHref && projectHref !== releaseHref && (
          <Button
            size="compact-sm"
            variant="default"
            component="a"
            href={projectHref}
            target="_blank"
            rel={SAFE_NEW_TAB_REL}
            leftSection={<IconExternalLink style={zoomCompensatedSize(14)} />}
          >
            {t("projectPage")}
          </Button>
        )}
      </div>
    </div>
  );
};

interface IssueDetailProps {
  group: IssueGroup;
  layout: DetailLayout;
}

export const IssueDetail = ({ group, layout }: IssueDetailProps) => {
  const t = useI18n("widget.releases");

  return (
    <div className={`releases-detail ${classes.detail}`} data-layout={layout}>
      {layout === "pane" && (
        <div className={classes.detailHead}>
          <span className={classes.issueIcon} data-large>
            <IconAlertTriangle style={zoomCompensatedSize(20)} />
          </span>
          <div className={classes.detailTitle}>
            <div className={classes.detailName}>
              {t(`issue.${group.code}.title`, { provider: group.providerName ?? "" })}
            </div>
            <div className={classes.detailId}>{t("issue.affected", { count: group.entries.length })}</div>
          </div>
        </div>
      )}
      <div className={classes.hint}>{t(`issue.${group.code}.hint`)}</div>
      <ul className={classes.members}>
        {group.entries.map((entry) => (
          <li key={entry.id} className={classes.member}>
            <EntryIcon entry={entry} size={16} />
            <span className={classes.memberName}>{entry.name}</span>
            <span className={classes.memberId}>{describeSource(entry)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
