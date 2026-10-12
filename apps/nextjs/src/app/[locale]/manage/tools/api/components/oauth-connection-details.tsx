"use client";

import { Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { formatOAuthDisplayText, getOAuthCallbackHost } from "./oauth-display";

type OAuthConnection = RouterOutputs["apiKeys"]["getOwnOAuth"][number];

export const OAuthConnectionDetails = ({ connection }: { connection: OAuthConnection }) => {
  const t = useI18n("management.page.tool.api.tab.apiKey.provenance");
  const locale = useCurrentIntlLocale();
  const issuedAt = connection.oauthIssuedAt;
  const hasIssuedAt = issuedAt !== null && Number.isFinite(issuedAt.getTime());
  const fields = [
    { label: t("credentialId"), value: connection.id },
    { label: t("clientId"), value: connection.oauthClientId },
    { label: t("callbackHost"), value: getOAuthCallbackHost(connection.oauthRedirectUri) },
    { label: t("callbackUrl"), value: connection.oauthRedirectUri },
  ];

  return (
    <dl style={{ margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-xs)" }}>
      {fields.map(({ label, value }) => (
        <div key={label}>
          <Text component="dt" size="sm" fw={500}>
            {label}
          </Text>
          <Text component="dd" size="sm" m={0} dir="ltr" style={{ overflowWrap: "anywhere", unicodeBidi: "isolate" }}>
            {value === null ? t("unknown") : formatOAuthDisplayText(value)}
          </Text>
        </div>
      ))}
      <div>
        <Text component="dt" size="sm" fw={500}>
          {t("issuedAt")}
        </Text>
        <Text component="dd" size="sm" m={0}>
          {hasIssuedAt ? (
            <time dateTime={issuedAt.toISOString()}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(
                issuedAt,
              )}
            </time>
          ) : (
            t("unknown")
          )}
        </Text>
      </div>
    </dl>
  );
};
