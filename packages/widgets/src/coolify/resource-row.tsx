"use client";

import { ActionIcon } from "@mantine/core";
import { IconExternalLink, IconFileText } from "@tabler/icons-react";

import type { CoolifyServiceWithContext } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.css";
import { cleanFqdn, getResourceTimestamp, parseStatus } from "./coolify-utils";
import { ServiceApplicationRow } from "./service-application-row";
import { getStatusTone, StatusPill } from "./status-pill";

interface ResourceRowProps {
  item: {
    uuid: string;
    name: string;
    status?: string | null;
    fqdn?: string | null;
    updated_at?: string | null;
    last_online_at?: string | null;
    projectName?: string;
    projectUuid?: string;
    environmentName?: string;
    environmentUuid?: string;
  };
  baseUrl: string;
  resourceType: "application" | "service";
  nestedApplications?: CoolifyServiceWithContext["applications"];
}

export function ResourceRow({ item, baseUrl, resourceType, nestedApplications }: ResourceRowProps) {
  const t = useI18n("widget.coolify");
  const status = parseStatus(item.status ?? "");
  const statusLabel = t(`status.${status}`);

  const resourceUrl = getSafeApplicationUrl(
    item.projectUuid && item.environmentUuid
      ? `${baseUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${resourceType}/${item.uuid}`
      : undefined,
  );
  const logsUrl = getSafeApplicationUrl(resourceUrl ? `${resourceUrl}/logs` : undefined);
  const publicUrl = getSafeApplicationUrl(cleanFqdn(item.fqdn));
  const resourceTimestamp = getResourceTimestamp(item, resourceType);
  const context = `${item.projectName ?? "—"} / ${item.environmentName ?? "—"}`;

  return (
    <>
      <div className={classes.tableRow}>
        <div className={classes.tableMain}>
          <a
            className={classes.tableName}
            href={resourceUrl ?? undefined}
            target={resourceUrl ? "_blank" : undefined}
            rel={resourceUrl ? SAFE_NEW_TAB_REL : undefined}
          >
            {item.name}
          </a>
          <span className={classes.tableMeta}>
            {context}
            {resourceTimestamp && ` · ${resourceTimestamp}`}
          </span>
        </div>
        <div className={classes.tableAside}>
          {publicUrl && (
            <ActionIcon
              className={`${actionTargetClasses.root} ${classes.iconAction}`}
              component="a"
              href={publicUrl}
              target="_blank"
              rel={SAFE_NEW_TAB_REL}
              aria-label={t("action.openResource", { name: item.name })}
              variant="subtle"
              color="gray"
            >
              <IconExternalLink size={15} />
            </ActionIcon>
          )}
          {logsUrl && (
            <ActionIcon
              className={`${actionTargetClasses.root} ${classes.iconAction}`}
              component="a"
              href={logsUrl}
              target="_blank"
              rel={SAFE_NEW_TAB_REL}
              aria-label={t("action.openLogs", { name: item.name })}
              variant="subtle"
              color="gray"
            >
              <IconFileText size={15} />
            </ActionIcon>
          )}
          <span className={classes.statusCell}>
            <StatusPill tone={getStatusTone(status)} label={statusLabel} />
          </span>
        </div>
      </div>
      {nestedApplications && nestedApplications.length > 0 && (
        <ul className={classes.nested} aria-label={t("details.serviceApplications", { name: item.name })}>
          {nestedApplications.map((application) => (
            <ServiceApplicationRow key={application.uuid} application={application} />
          ))}
        </ul>
      )}
    </>
  );
}
