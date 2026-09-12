"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import type { WidgetJson } from "@homarr/widget-sdk/shared";
import { getConnectionUrlSuggestion } from "./_package-connection-url";
type Connection = RouterOutputs["customWidget"]["package"]["connections"][number];
type Authentication = "none" | "basic" | "bearer" | "headers" | "cookie" | "query";
const authKinds = ["none", "basic", "bearer", "headers", "cookie", "query"];
export function ConnectionEditor({ onSaved, connection }: { onSaved(): void; connection?: Connection }) {
  const t = useI18n("customWidget.package");
  const integrations = clientApi.integration.all.useQuery();
  const save = clientApi.customWidget.package.saveConnection.useMutation();
  const configuration: Record<string, unknown> = connection?.configuration ?? {};
  const tls: Record<string, unknown> = isRecord(configuration.tls) ? configuration.tls : {};
  let initialAuth: Authentication = "none";
  if (typeof configuration.auth === "string" && authKinds.includes(configuration.auth))
    initialAuth = configuration.auth as Authentication;
  let initialKind: "http" | "integration" | "service" = "http";
  if (configuration.kind === "integration") initialKind = "integration";
  if (configuration.kind === "service") initialKind = "service";
  const [name, setName] = useState(connection?.name ?? "");
  const [kind, setKind] = useState<"http" | "integration" | "service">(initialKind);
  const [integrationId, setIntegrationId] = useState<string | null>(connection?.integrationId ?? null);
  const [baseUrl, setBaseUrl] = useState(typeof configuration.baseUrl === "string" ? configuration.baseUrl : "");
  const [browserUrl, setBrowserUrl] = useState(
    typeof configuration.browserUrl === "string" ? configuration.browserUrl : "",
  );
  const [auth, setAuth] = useState<Authentication>(initialAuth);
  const [secret, setSecret] = useState("");
  const [username, setUsername] = useState("");
  const [headers, setHeaders] = useState("{}");
  const [verifyTls, setVerifyTls] = useState(tls.rejectUnauthorized !== false);
  const [timeoutMs, setTimeoutMs] = useState(
    typeof configuration.timeoutMs === "number" ? configuration.timeoutMs : 30_000,
  );
  const [serviceType, setServiceType] = useState(
    typeof configuration.serviceType === "string" ? configuration.serviceType : "custom",
  );
  const [serviceSettings, setServiceSettings] = useState(JSON.stringify(configuration.settings ?? {}, null, 2));
  const [serviceSecrets, setServiceSecrets] = useState("");
  const [replaceServiceSecrets, setReplaceServiceSecrets] = useState(false);
  const [error, setError] = useState("");
  const serverUrlSuggestion = getConnectionUrlSuggestion(baseUrl);
  const browserUrlSuggestion = getConnectionUrlSuggestion(browserUrl);
  const submit = async () => {
    try {
      let secrets: Record<string, string> = {};
      if (auth === "basic") secrets = { username, password: secret };
      if (auth === "bearer") secrets = { token: secret };
      if (auth === "cookie") secrets = { cookie: secret };
      if (auth === "headers" || auth === "query") {
        const parsed: unknown = JSON.parse(headers);
        if (!isRecord(parsed) || Object.values(parsed).some((value) => typeof value !== "string"))
          throw new Error(t("stringMap"));
        secrets = parsed as Record<string, string>;
      }
      let settings: Record<string, WidgetJson> | undefined;
      if (kind === "service") {
        const parsed: unknown = JSON.parse(serviceSettings);
        if (!isRecord(parsed)) throw new Error(t("serviceSettingsObject"));
        settings = parsed as Record<string, WidgetJson>;
        const credentials: unknown = JSON.parse(serviceSecrets || "{}");
        if (!isRecord(credentials) || Object.values(credentials).some((value) => typeof value !== "string"))
          throw new Error(t("stringMap"));
        secrets = credentials as Record<string, string>;
      }
      let replaceSecrets = !connection || initialAuth !== auth || secret !== "" || username !== "" || headers !== "{}";
      if (kind === "service")
        replaceSecrets = !connection || initialKind !== kind || serviceSecrets !== "" || replaceServiceSecrets;
      let secretUpdates: Record<string, string> | undefined;
      if (
        connection &&
        kind === "http" &&
        initialKind === kind &&
        initialAuth === auth &&
        ["basic", "bearer", "cookie"].includes(auth) &&
        replaceSecrets
      ) {
        secretUpdates = Object.fromEntries(Object.entries(secrets).filter(([, value]) => value !== ""));
        replaceSecrets = false;
      }
      await save.mutateAsync({
        id: connection?.id,
        name,
        integrationId,
        configuration: {
          kind,
          serviceType: kind === "service" ? serviceType : undefined,
          settings,
          baseUrl: kind === "http" ? baseUrl || undefined : undefined,
          browserUrl: browserUrl || undefined,
          auth,
          headers: isRecord(configuration.headers)
            ? Object.fromEntries(
                Object.entries(configuration.headers).filter(
                  (entry): entry is [string, string] => typeof entry[1] === "string",
                ),
              )
            : {},
          tls: {
            rejectUnauthorized: verifyTls,
            ca: typeof tls.ca === "string" ? tls.ca : undefined,
            cert: typeof tls.cert === "string" ? tls.cert : undefined,
          },
          maxResponseBytes:
            typeof configuration.maxResponseBytes === "number" ? configuration.maxResponseBytes : undefined,
          timeoutMs,
        },
        secrets: replaceSecrets ? secrets : undefined,
        secretUpdates,
      });
      setSecret("");
      setHeaders("{}");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{connection ? t("editConnection") : t("newConnection")}</Text>
        {connection && <Alert color="yellow">{t("editConnectionImpact")}</Alert>}
        <TextInput
          label={t("connectionName")}
          required
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <Select
          label={t("connectionKind")}
          value={kind}
          data={[
            { value: "http", label: "HTTP" },
            { value: "integration", label: t("integration") },
            { value: "service", label: t("service") },
          ]}
          onChange={(value) => {
            if (value === "http" || value === "integration" || value === "service") setKind(value);
          }}
        />
        {kind === "integration" && (
          <Select
            searchable
            label={t("integration")}
            data={(integrations.data ?? []).map((integration) => ({ value: integration.id, label: integration.name }))}
            value={integrationId}
            onChange={setIntegrationId}
          />
        )}
        {kind === "service" && (
          <>
            <TextInput
              label={t("serviceType")}
              description={t("serviceTypeHelp")}
              value={serviceType}
              onChange={(event) => setServiceType(event.currentTarget.value)}
              required
            />
            <Textarea
              label={t("serviceSettings")}
              description={t("serviceSettingsHelp")}
              value={serviceSettings}
              onChange={(event) => setServiceSettings(event.currentTarget.value)}
              autosize
              minRows={4}
              maxRows={12}
              spellCheck={false}
            />
            <Textarea
              label={t("serviceSecrets")}
              description={t("serviceSecretsHelp")}
              value={serviceSecrets}
              onChange={(event) => setServiceSecrets(event.currentTarget.value)}
              autosize
              minRows={3}
              maxRows={8}
              autoComplete="off"
              spellCheck={false}
            />
            {connection && (
              <Checkbox
                label={t("replaceServiceSecrets")}
                checked={replaceServiceSecrets}
                onChange={(event) => setReplaceServiceSecrets(event.currentTarget.checked)}
              />
            )}
          </>
        )}
        {kind === "http" && (
          <>
            <TextInput
              label={t("serverUrl")}
              description={t("localNetwork")}
              placeholder={t("serverUrlExample")}
              required
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.currentTarget.value)}
            />
            {serverUrlSuggestion && (
              <Button
                size="compact-xs"
                variant="subtle"
                w="fit-content"
                onClick={() => setBaseUrl(serverUrlSuggestion)}
              >
                {t("useUrlSuggestion", { url: serverUrlSuggestion })}
              </Button>
            )}
            <TextInput
              label={t("browserUrl")}
              value={browserUrl}
              onChange={(event) => setBrowserUrl(event.currentTarget.value)}
            />
            {browserUrlSuggestion && (
              <Button
                size="compact-xs"
                variant="subtle"
                w="fit-content"
                onClick={() => setBrowserUrl(browserUrlSuggestion)}
              >
                {t("useUrlSuggestion", { url: browserUrlSuggestion })}
              </Button>
            )}
            <Select
              label={t("authentication")}
              value={auth}
              data={["none", "basic", "bearer", "headers", "cookie", "query"]}
              onChange={(value) => {
                if (value && ["none", "basic", "bearer", "headers", "cookie", "query"].includes(value))
                  setAuth(value as typeof auth);
              }}
            />
            {auth === "basic" && (
              <TextInput
                autoComplete="off"
                label={t("username")}
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
              />
            )}
            {["basic", "bearer", "cookie"].includes(auth) && (
              <PasswordInput
                autoComplete="new-password"
                label={t("credential")}
                value={secret}
                onChange={(event) => setSecret(event.currentTarget.value)}
              />
            )}
            {(auth === "headers" || auth === "query") && (
              <Textarea
                autoComplete="off"
                label={auth === "query" ? t("secretQuery") : t("secretHeaders")}
                placeholder={t("headersExample")}
                value={headers}
                onChange={(event) => setHeaders(event.currentTarget.value)}
              />
            )}
            <Checkbox
              label={t("verifyTls")}
              checked={verifyTls}
              onChange={(event) => setVerifyTls(event.currentTarget.checked)}
            />
            <NumberInput
              label={t("timeout")}
              value={timeoutMs}
              min={100}
              max={300000}
              onChange={(value) => {
                if (typeof value === "number") setTimeoutMs(value);
              }}
            />
          </>
        )}
        {error && <Alert color="red">{error}</Alert>}
        <Button loading={save.isPending} disabled={!name.trim()} onClick={() => void submit()}>
          {t("saveConnection")}
        </Button>
      </Stack>
    </Paper>
  );
}
