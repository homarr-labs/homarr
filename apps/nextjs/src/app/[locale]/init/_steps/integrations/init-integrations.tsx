"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Button,
  Card,
  Center,
  Collapse,
  Group,
  Loader,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowRight, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { IntegrationKind, UrlTemplateMode } from "@homarr/definitions";
import { buildIntegrationUrl, getIntegrationName } from "@homarr/definitions";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { IntegrationMultiSelectGrid } from "~/components/integration/integration-multi-select-grid";
import { DockerDiscoveryIndicator } from "./docker-discovery-panel";

type Phase = "select" | "configure" | "done";

interface IntegrationDraft {
  kind: IntegrationKind;
  initialUrl: string;
  initialName?: string;
  dockerPort?: number | null;
  source: "manual" | "docker";
}

const CARD_WIDTH = 64 * 16;

export const InitIntegrations = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [drafts, setDrafts] = useState<Map<IntegrationKind, IntegrationDraft>>(new Map());
  const [selectedKinds, setSelectedKinds] = useState<IntegrationKind[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [baseHost, setBaseHost] = useState("");
  const [urlMode, setUrlMode] = useState<UrlTemplateMode>("subdomain");
  const t = useScopedI18n("init.step.integrations");
  const router = useRouter();

  const { mutateAsync: setupIntegrations } = clientApi.onboard.setupIntegrations.useMutation();
  const { mutateAsync: createApps } = clientApi.onboard.createAppsFromDiscovery.useMutation();

  const { data: dockerData, isPending: isDockerLoading } = clientApi.onboard.discoverDockerServices.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const dockerIntegrations = dockerData?.status === "success" ? dockerData.integrations : [];
  const dockerApps = dockerData?.status === "success" ? dockerData.apps : [];

  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());

  const dockerApplied = useRef(false);
  useEffect(() => {
    if (dockerData?.status !== "success" || dockerApplied.current) return;
    dockerApplied.current = true;

    const newDrafts = new Map(drafts);
    const newKinds = new Set(selectedKinds);

    for (const item of dockerData.integrations) {
      if (!newDrafts.has(item.kind)) {
        newDrafts.set(item.kind, {
          kind: item.kind,
          initialUrl: item.suggestedUrl,
          initialName: item.containerName,
          dockerPort: item.publishedPort,
          source: "docker",
        });
      }
      newKinds.add(item.kind);
    }

    setDrafts(newDrafts);
    setSelectedKinds(Array.from(newKinds));
    setSelectedAppIds(new Set(dockerData.apps.map((app) => app.containerId)));
  }, [dockerData]);

  const handleSelectionChange = useCallback((kinds: IntegrationKind[]) => {
    setSelectedKinds(kinds);
  }, []);

  const handleToggleApp = useCallback((containerId: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  }, []);

  const handleContinueToConfig = () => {
    const newDrafts = new Map(drafts);
    for (const kind of selectedKinds) {
      const existing = newDrafts.get(kind);
      if (baseHost) {
        newDrafts.set(kind, {
          kind,
          initialUrl: buildIntegrationUrl(kind, baseHost, urlMode, existing?.dockerPort ?? undefined),
          initialName: existing?.initialName,
          dockerPort: existing?.dockerPort,
          source: existing?.source ?? "manual",
        });
      } else if (!existing) {
        newDrafts.set(kind, { kind, initialUrl: "", source: "manual" });
      }
    }
    setDrafts(newDrafts);
    setCurrentIndex(0);
    setPhase("configure");
  };

  const finishSetupAsync = async () => {
    setPhase("done");
    try {
      const appsToCreate = dockerApps.filter((app) => selectedAppIds.has(app.containerId));
      if (appsToCreate.length > 0) {
        await createApps(
          appsToCreate.map((app) => ({
            name: app.containerName,
            href: app.suggestedUrl || null,
            iconUrl: app.iconUrl,
          })),
        );
      }
      await setupIntegrations();
      router.refresh();
    } catch {
      showErrorNotification({
        title: t("configure.error.title"),
        message: t("configure.error.message"),
      });
      setPhase("select");
    }
  };

  const advanceOrFinish = () => {
    if (currentIndex + 1 >= selectedKinds.length) {
      void finishSetupAsync();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const backToSelect = () => {
    setPhase("select");
    setCurrentIndex(0);
  };

  if (phase === "done") {
    return (
      <Card w={CARD_WIDTH} maw="90vw" withBorder>
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>{t("configure.finishing")}</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  if (phase === "configure") {
    return (
      <ConfigurePhase
        selectedKinds={selectedKinds}
        currentIndex={currentIndex}
        drafts={drafts}
        baseHost={baseHost}
        setBaseHost={setBaseHost}
        urlMode={urlMode}
        setUrlMode={setUrlMode}
        onSuccess={advanceOrFinish}
        onCancel={backToSelect}
        onSkip={advanceOrFinish}
      />
    );
  }

  return (
    <Card w={CARD_WIDTH} maw="90vw" withBorder>
      <Stack>
        <Text>{t("description")}</Text>

        <DockerDiscoveryIndicator
          integrations={dockerIntegrations}
          apps={dockerApps}
          selectedAppIds={selectedAppIds}
          onToggleApp={handleToggleApp}
          isLoading={isDockerLoading}
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {t("urlTemplate.label")}
          </Text>
          <Group gap="sm" grow>
            <TextInput
              placeholder={t("urlTemplate.placeholder")}
              value={baseHost}
              onChange={(e) => setBaseHost(e.currentTarget.value)}
            />
            <SegmentedControl
              value={urlMode}
              onChange={(value) => setUrlMode(value as UrlTemplateMode)}
              data={[
                { label: t("urlTemplate.mode.subdomain"), value: "subdomain" },
                { label: t("urlTemplate.mode.hostPort"), value: "hostPort" },
              ]}
              style={{ flex: "0 0 auto" }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            {baseHost
              ? t("urlTemplate.preview", { example: buildIntegrationUrl("sonarr", baseHost, urlMode) })
              : t("urlTemplate.hint")}
          </Text>
        </Stack>

        <IntegrationMultiSelectGrid
          selectedKinds={selectedKinds}
          onSelectionChange={handleSelectionChange}
          onboarding
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => void finishSetupAsync()}>
            {t("action.skip")}
          </Button>
          <Button
            onClick={handleContinueToConfig}
            disabled={selectedKinds.length === 0 || undefined}
            rightSection={<IconArrowRight size={16} stroke={1.5} />}
            suppressHydrationWarning
          >
            {t("action.continue")} {selectedKinds.length > 0 && `(${selectedKinds.length})`}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};

interface ConfigurePhaseProps {
  selectedKinds: IntegrationKind[];
  currentIndex: number;
  drafts: Map<IntegrationKind, IntegrationDraft>;
  baseHost: string;
  setBaseHost: (value: string) => void;
  urlMode: UrlTemplateMode;
  setUrlMode: (value: UrlTemplateMode) => void;
  onSuccess: () => void;
  onCancel: () => void;
  onSkip: () => void;
}

const ConfigurePhase = ({
  selectedKinds,
  currentIndex,
  drafts,
  baseHost,
  setBaseHost,
  urlMode,
  setUrlMode,
  onSuccess,
  onCancel,
  onSkip,
}: ConfigurePhaseProps) => {
  const t = useScopedI18n("init.step.integrations");
  const [helpersOpen, { toggle: toggleHelpers }] = useDisclosure(false);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- currentIndex is always within bounds of selectedKinds
  const currentKind = selectedKinds[currentIndex]!;
  const draft = drafts.get(currentKind);
  const progress = ((currentIndex + 1) / selectedKinds.length) * 100;
  const computedUrl = baseHost
    ? buildIntegrationUrl(currentKind, baseHost, urlMode, draft?.dockerPort ?? undefined)
    : draft?.initialUrl;

  return (
    <Card w={CARD_WIDTH} maw="90vw" withBorder>
      <Stack>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IntegrationAvatar kind={currentKind} size="sm" />
            <Text fw={500}>{getIntegrationName(currentKind)}</Text>
          </Group>
          <Tooltip label={t("configure.helpers.tooltip")}>
            <ActionIcon variant={helpersOpen ? "light" : "subtle"} color="gray" onClick={toggleHelpers}>
              <IconSettings size={18} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Stack gap={4}>
          <Progress value={progress} size="sm" />
          <Text size="xs" c="dimmed" ta="center">
            {t("configure.progress", { current: String(currentIndex + 1), total: String(selectedKinds.length) })}
          </Text>
        </Stack>

        <Collapse in={helpersOpen}>
          <Stack
            gap="xs"
            p="xs"
            style={{ background: "var(--mantine-color-default-hover)", borderRadius: "var(--mantine-radius-sm)" }}
          >
            <Text size="xs" c="dimmed">
              {t("configure.helpers.description")}
            </Text>
            <Group gap="sm" grow>
              <TextInput
                size="xs"
                placeholder={t("urlTemplate.placeholder")}
                value={baseHost}
                onChange={(e) => setBaseHost(e.currentTarget.value)}
              />
              <SegmentedControl
                size="xs"
                value={urlMode}
                onChange={(value) => setUrlMode(value as UrlTemplateMode)}
                data={[
                  { label: t("urlTemplate.mode.subdomain"), value: "subdomain" },
                  { label: t("urlTemplate.mode.hostPort"), value: "hostPort" },
                ]}
                style={{ flex: "0 0 auto" }}
              />
            </Group>
            {baseHost && (
              <Text size="xs" c="dimmed">
                {t("urlTemplate.preview", {
                  example: buildIntegrationUrl(currentKind, baseHost, urlMode, draft?.dockerPort ?? undefined),
                })}
              </Text>
            )}
          </Stack>
        </Collapse>

        <NewIntegrationForm
          key={currentKind}
          kind={currentKind}
          initialUrl={computedUrl}
          initialName={draft?.initialName}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSkip={onSkip}
          isOnboarding
        />
      </Stack>
    </Card>
  );
};
