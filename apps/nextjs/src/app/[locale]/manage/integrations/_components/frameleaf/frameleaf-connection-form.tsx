"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Stack, TextInput } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface Props {
  integration?: { id: string; name: string; url: string };
  initialName?: string;
  initialUrl?: string;
}
interface Status {
  callback: string | null;
  status: string;
}
export function FrameleafConnectionForm({ integration, initialName, initialUrl }: Props) {
  const t = useI18n("integration.frameleaf");
  const common = useI18n("common");
  const [name, setName] = useState(integration?.name ?? initialName ?? "Frameleaf");
  const [origin, setOrigin] = useState(integration?.url ?? initialUrl ?? "");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const integrationId = integration?.id;
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("frameleaf") === "consent") setError("consent");
  }, [integrationId]);
  useEffect(() => {
    if (busy) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const readAsync = async () => {
      try {
        const response = await fetch(
          `/api/integrations/frameleaf${integrationId ? `?id=${encodeURIComponent(integrationId)}` : ""}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const value = (await response.json()) as Status;
        if (controller.signal.aborted) return;
        setStatus(value);
        if (["pending", "exchanging", "verifying", "refreshing"].includes(value.status))
          timer = setTimeout(() => void readAsync(), 1000);
      } catch {
        if (!controller.signal.aborted) setError("unavailable");
      }
    };
    void readAsync();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [integrationId, busy]);
  const connected = status?.status === "connected";
  const disconnected = status?.status === "disconnected";
  const pending = status && ["pending", "exchanging", "verifying", "refreshing"].includes(status.status);
  const submitAsync = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/frameleaf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          disconnected
            ? { action: "start", id: integration?.id, name, origin, clientId }
            : { action: "disconnect", id: integration?.id },
        ),
      });
      const result = (await response.json()) as { error?: string; authorizationUrl?: string };
      if (!response.ok) {
        setError(result.error ?? "unavailable");
        return;
      }
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      setStatus((previous) => (previous ? { ...previous, status: "disconnected" } : null));
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitAsync();
      }}
    >
      <Stack>
        <Alert>{t("help")}</Alert>
        {status && (
          <Alert color={connected ? "green" : "blue"}>
            {t(connected ? "connected" : disconnected ? "disconnected" : pending ? "pending" : "reconnect")}
          </Alert>
        )}
        <TextInput
          required
          label={common("field.name")}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          disabled={!disconnected || busy}
          maxLength={127}
        />
        <TextInput
          required
          type="url"
          label={t("origin")}
          description={t("originHelp")}
          value={origin}
          onChange={(event) => setOrigin(event.currentTarget.value)}
          readOnly={Boolean(integrationId)}
          disabled={!disconnected || busy}
          maxLength={2048}
        />
        <TextInput
          label={t("clientId")}
          description={t("clientIdHelp")}
          value={clientId}
          onChange={(event) => setClientId(event.currentTarget.value)}
          disabled={!disconnected || busy}
          maxLength={512}
          autoComplete="off"
        />
        {status?.callback ? (
          <TextInput label={t("callback")} value={status.callback} readOnly />
        ) : status ? (
          <Alert color="yellow">{t("configuration")}</Alert>
        ) : null}
        {error && (
          <Alert color="red">
            {t(error === "registration" ? "registration" : error === "busy" ? "busy" : "failed")}
          </Alert>
        )}
        <Button type="submit" loading={busy} disabled={!status?.callback || !status}>
          {t(disconnected ? "connect" : "disconnect")}
        </Button>
      </Stack>
    </form>
  );
}
