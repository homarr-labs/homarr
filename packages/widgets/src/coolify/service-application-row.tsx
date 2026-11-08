"use client";

import type { CoolifyServiceWithContext } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.css";
import { cleanFqdn, parseStatus } from "./coolify-utils";
import { getStatusTone, StatusDot } from "./status-pill";

type ServiceApplication = NonNullable<CoolifyServiceWithContext["applications"]>[number];

export const ServiceApplicationRow = ({ application }: { application: ServiceApplication }) => {
  const t = useI18n("widget.coolify");
  const status = parseStatus(application.status ?? "");
  const publicUrl = getSafeApplicationUrl(cleanFqdn(application.fqdn));

  return (
    <li className={classes.nestedRow}>
      <StatusDot tone={getStatusTone(status)} />
      {publicUrl ? (
        <a className={classes.rowName} href={publicUrl} target="_blank" rel={SAFE_NEW_TAB_REL}>
          {application.name}
        </a>
      ) : (
        <span className={classes.rowName}>{application.name}</span>
      )}
      <span className={classes.rowMeta}>{t(`status.${status}`)}</span>
    </li>
  );
};
