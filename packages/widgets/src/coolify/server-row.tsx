"use client";

import type { CoolifyServer } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.css";
import { getCoolifyServerState, getCoolifyServerStatus } from "./coolify-utils";
import { getStatusTone, StatusPill } from "./status-pill";

interface ServerRowProps {
  server: CoolifyServer;
  counts: { apps: number; services: number };
  baseUrl: string;
  showIp: boolean;
}

export function ServerRow({ server, counts, baseUrl, showIp }: ServerRowProps) {
  const t = useI18n("widget.coolify");
  const isBuildServer = server.settings?.is_build_server === true;
  const reachability = getCoolifyServerState(server, "is_reachable");
  const usability = getCoolifyServerState(server, "is_usable");
  const status = getCoolifyServerStatus(server);
  const serverUrl = baseUrl ? getSafeApplicationUrl(`${baseUrl}/server/${server.uuid}`) : null;
  const reachabilityLabel =
    reachability === undefined
      ? `${t("server.reachability")}: ${t("status.unknown")}`
      : t(reachability ? "status.reachable" : "status.unreachable");
  const usabilityLabel =
    usability === undefined
      ? `${t("server.usability")}: ${t("status.unknown")}`
      : t(usability ? "status.usable" : "status.unusable");
  const meta = [
    showIp ? (server.ip ?? "—") : "•••.•••.•••.•••",
    reachabilityLabel,
    usabilityLabel,
    isBuildServer
      ? t("server.buildServer")
      : t("server.resourceCounts", { applications: counts.apps, services: counts.services }),
  ];

  return (
    <div className={classes.tableRow}>
      <div className={classes.tableMain}>
        <a
          className={classes.tableName}
          href={serverUrl ?? undefined}
          target={serverUrl ? "_blank" : undefined}
          rel={serverUrl ? SAFE_NEW_TAB_REL : undefined}
        >
          {server.name}
        </a>
        {server.description && <span className={classes.tableMeta}>{server.description}</span>}
        <span className={classes.tableMeta}>{meta.join(" · ")}</span>
      </div>
      <StatusPill
        tone={getStatusTone(status)}
        label={t(status === "online" && usability === true ? "overview.ready" : `status.${status}`)}
      />
    </div>
  );
}
