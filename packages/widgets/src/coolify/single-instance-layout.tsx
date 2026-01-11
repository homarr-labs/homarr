"use client";

import { Accordion, Anchor, Group, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { ApplicationsSection } from "./applications-section";
import { buildServerResourceCounts } from "./coolify-utils";
import { ServersSection } from "./servers-section";
import { ServicesSection } from "./services-section";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_ICON_URL } from "./types";

interface SingleInstanceLayoutProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isTiny: boolean;
  widgetKey: string;
}

export function SingleInstanceLayout({ instance, options, isTiny, widgetKey }: SingleInstanceLayoutProps) {
  const t = useScopedI18n("widget.coolify");
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${widgetKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${widgetKey}`,
    defaultValue: ["applications"],
  });

  const serverResourceCounts = buildServerResourceCounts(
    instance.instanceInfo.servers,
    instance.instanceInfo.applications,
    instance.instanceInfo.services,
  );

  const baseUrl = instance.integrationUrl.replace(/\/+$/, "");
  const displayUrl = baseUrl.replace(/^https?:\/\//, "");
  const relativeTime = useTimeAgo(instance.updatedAt);

  return (
    <ScrollArea h="100%">
      <Stack gap={0}>
        <Group p="xs" justify="center" gap="xs" style={{ borderBottom: "2px solid #8B5CF6" }}>
          <Group gap={2}>
            <Image src={COOLIFY_ICON_URL} alt="Coolify" w={isTiny ? 18 : 24} h={isTiny ? 18 : 24} />
            <Text fz={isTiny ? "xs" : "sm"} fw={700} style={{ color: "#8B5CF6" }}>
              oolify
            </Text>
          </Group>
          <Anchor href={baseUrl} target="_blank" fz={isTiny ? "xs" : "sm"} fw={500} c="dimmed" lineClamp={1}>
            {displayUrl}
          </Anchor>
        </Group>

        <Accordion variant="contained" chevronPosition="right" multiple value={openSections} onChange={setOpenSections}>
          {options.showServers && (
            <ServersSection
              servers={instance.instanceInfo.servers}
              serverResourceCounts={serverResourceCounts}
              baseUrl={baseUrl}
              isTiny={isTiny}
              showIp={showIp}
              onToggleIp={() => setShowIp((prev) => !prev)}
            />
          )}
          {options.showApplications && (
            <ApplicationsSection applications={instance.instanceInfo.applications} baseUrl={baseUrl} isTiny={isTiny} />
          )}
          {options.showServices && (
            <ServicesSection services={instance.instanceInfo.services} baseUrl={baseUrl} isTiny={isTiny} />
          )}
        </Accordion>

        <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Group gap={2}>
            <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
            <Text size="xs" c="dimmed">
              v{instance.instanceInfo.version}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t("footer.updated", { when: relativeTime })}
          </Text>
        </Group>
      </Stack>
    </ScrollArea>
  );
}
