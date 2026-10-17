import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Anchor, Button, Code, Divider, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { sessionTokenCookieName } from "@homarr/auth/server";
import type { SupportedLanguage } from "@homarr/translation";
import { getIntlLocale } from "@homarr/translation";
import { getI18n } from "@homarr/translation/server";

import { formatOAuthDisplayText, getOAuthCallbackHost } from "~/app/[locale]/manage/tools/api/components/oauth-display";
import { getMcpConsentBindingCookieName, readMcpConsent } from "~/app/api/mcp/oauth/_grant";
import { ConsentProblem } from "./_consent-problem";
import { ConsentPermissions } from "./_permissions";

interface McpConsentPageProps {
  params: Promise<{ locale: SupportedLanguage }>;
  searchParams: Promise<{ pending?: string | string[] }>;
}

export default async function McpConsentPage({ params, searchParams }: McpConsentPageProps) {
  const query = await searchParams;
  if (typeof query.pending !== "string" || !/^[a-f0-9]{32}$/.test(query.pending)) {
    return <ConsentProblem reason="invalid_request" />;
  }

  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const sessionToken = cookieStore.get(sessionTokenCookieName)?.value;
  const result = readMcpConsent({
    pendingId: query.pending,
    browserBinding: cookieStore.get(getMcpConsentBindingCookieName(query.pending))?.value ?? null,
    session:
      session && sessionToken
        ? { userId: session.user.id, sessionToken, expiresAt: Date.parse(session.expires) }
        : null,
  });

  if (!result.ok) {
    if (result.error === "login_required") {
      const resumeUrl = `/api/mcp/oauth/authorize?pending=${encodeURIComponent(query.pending)}`;
      redirect(`/auth/login?callbackUrl=${encodeURIComponent(resumeUrl)}`);
    }
    return <ConsentProblem reason={result.error} />;
  }

  if (!session) return <ConsentProblem reason="session_changed" />;

  const [t, { locale }] = await Promise.all([getI18n("user.page.mcpConsent"), params]);
  const { consent } = result;
  const fields = [
    { label: t("account.name"), value: session.user.name ?? t("account.nameNotRecorded"), technical: false },
    { label: t("client.name"), value: consent.clientName || t("client.nameNotSupplied"), technical: false },
    {
      label: t("client.callbackHost"),
      value: getOAuthCallbackHost(consent.redirectUri) ?? t("client.hostUnavailable"),
      technical: true,
    },
    { label: t("client.callbackUrl"), value: consent.redirectUri, technical: true },
  ];
  const expiresAt = new Date(consent.expiresAt);

  return (
    <Stack gap="md" style={{ minWidth: 0 }}>
      <Stack gap="xs">
        <SimpleGrid component="dl" cols={{ base: 1, sm: 2 }} spacing="sm" m={0}>
          {fields.map(({ label, value, technical }) => (
            <div key={label} style={{ minWidth: 0 }}>
              <Text component="dt" size="sm" fw={500}>
                {label}
              </Text>
              <Code
                component="dd"
                fz="sm"
                m={0}
                display="block"
                px="xs"
                py={4}
                style={{ overflowWrap: "anywhere", whiteSpace: "normal", unicodeBidi: "isolate" }}
              >
                <bdi dir={technical ? "ltr" : undefined}>{formatOAuthDisplayText(value)}</bdi>
              </Code>
            </div>
          ))}
        </SimpleGrid>
        <Text size="sm">{t("client.unverifiedHint")}</Text>
      </Stack>

      <ConsentPermissions permissions={session.user.permissions} />

      <Stack gap={4}>
        <Text size="sm">{t("credential.breadth")}</Text>
        <Text size="sm">
          {t("credential.lifetime")}{" "}
          <Anchor href={`/manage/users/${encodeURIComponent(session.user.id)}/general`} size="sm">
            {t("credential.manageConnections")}
          </Anchor>
        </Text>
      </Stack>

      <details>
        <Text component="summary" size="sm" style={{ cursor: "pointer" }}>
          {t("details")}
        </Text>
        <Stack gap="xs" mt="xs">
          {[
            { label: t("account.id"), value: session.user.id },
            { label: t("client.id"), value: consent.clientId },
          ].map(({ label, value }) => (
            <Text key={label} size="sm" style={{ overflowWrap: "anywhere" }}>
              {label}:{" "}
              <Code fz="sm" style={{ overflowWrap: "anywhere", whiteSpace: "normal" }}>
                <bdi dir="ltr">{formatOAuthDisplayText(value)}</bdi>
              </Code>
            </Text>
          ))}
          <Text size="sm">
            {t("requestExpires")}{" "}
            <time dateTime={expiresAt.toISOString()}>
              {new Intl.DateTimeFormat(getIntlLocale(locale), {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              }).format(expiresAt)}
            </time>
          </Text>
        </Stack>
      </details>

      <Divider />

      <form method="post" action="/api/mcp/oauth/authorize" aria-describedby="mcp-decision-hint">
        <input type="hidden" name="pending" value={consent.pendingId} />
        <input type="hidden" name="consentToken" value={consent.consentToken} />
        <Stack gap="sm">
          <Text size="sm" id="mcp-decision-hint">
            {t("decisionHint")}
          </Text>
          <Group>
            <Button type="submit" name="decision" value="deny" variant="default" mih={44} style={{ flex: "1 1 12rem" }}>
              {t("deny")}
            </Button>
            <Button type="submit" name="decision" value="approve" mih={44} autoContrast style={{ flex: "1 1 12rem" }}>
              {t("allow")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
