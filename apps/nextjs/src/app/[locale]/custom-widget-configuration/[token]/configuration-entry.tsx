"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCheck, IconKey, IconLock } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface RequestDetails {
  widgetName: string;
  sourceName: string;
  kinds: Array<"apiKey" | "username" | "password">;
  expiresAt: number;
  status: "pending" | "completed";
  source: {
    baseUrl: string;
    networkScope: "public" | "private" | "loopback";
  };
}

export function CustomWidgetConfigurationEntry({ token }: { token: string }) {
  const t = useI18n("customWidget.secretEntry");
  const tSecret = useI18n("customWidget.secret");
  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  const [networkScope, setNetworkScope] = useState<"public" | "private" | "loopback">("public");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/custom-widgets/configuration-request/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = (await response.json()) as RequestDetails | { error: string };
        if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : t("unavailable"));
        setDetails(body);
        setBaseUrl(body.source.baseUrl);
        setNetworkScope(body.source.networkScope);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : t("unavailable")))
      .finally(() => setLoading(false));
  }, [t, token]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/custom-widgets/configuration-request/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl, networkScope, secrets: values }),
      });
      const body = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? t("saveError"));
      setDetails((current) => (current ? { ...current, status: "completed" } : current));
      setValues({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Center mih="100dvh" p="md">
      <Card withBorder shadow="md" radius="lg" p="xl" w="100%" maw={480}>
        <Stack gap="lg">
          <ThemeIcon size={48} radius="xl" variant="light">
            <IconLock size={24} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={1} size="h2">
              {t("title")}
            </Title>
            <Text c="dimmed">{t("description")}</Text>
          </Stack>
          {loading && <Text c="dimmed">{t("loading")}</Text>}
          {error && <Alert color="red">{error}</Alert>}
          {details?.status === "completed" && (
            <Alert color="green" icon={<IconCheck size={18} />}>
              {t("saved")}
            </Alert>
          )}
          {details?.status === "pending" && (
            <Stack gap="md">
              <Card withBorder bg="var(--mantine-color-default-hover)">
                <Text fw={600}>{details.widgetName}</Text>
                <Text size="sm" c="dimmed">
                  {t("source", { name: details.sourceName })}
                </Text>
              </Card>
              <TextInput
                label={t("baseUrl")}
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.currentTarget.value)}
                required
              />
              <Select
                label={t("networkScope")}
                data={["public", "private", "loopback"]}
                value={networkScope}
                allowDeselect={false}
                onChange={(value) => value && setNetworkScope(value as typeof networkScope)}
              />
              {details.kinds.map((kind) => {
                const Input = kind === "username" ? TextInput : PasswordInput;
                return (
                  <Input
                    key={kind}
                    label={tSecret(kind)}
                    leftSection={<IconKey size={16} />}
                    value={values[kind] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [kind]: event.currentTarget.value }))}
                    autoComplete="off"
                    required
                  />
                );
              })}
              <Button
                loading={saving}
                disabled={!URL.canParse(baseUrl) || details.kinds.some((kind) => !values[kind])}
                onClick={() => void submit()}
              >
                {t("save")}
              </Button>
              <Text size="xs" c="dimmed">
                {t("expires", { time: new Date(details.expiresAt).toLocaleTimeString() })}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
