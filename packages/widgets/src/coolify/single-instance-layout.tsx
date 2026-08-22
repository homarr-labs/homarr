"use client";

import { useState } from "react";
import { Accordion, Anchor, Group, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { ApplicationsSection } from "./applications-section";
import classes from "./component.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { buildServerResourceCounts } from "./coolify-utils";
import { ServersSection } from "./servers-section";
import { ServicesSection } from "./services-section";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_BRAND_COLOR, COOLIFY_ICON_URL } from "./types";

interface SingleInstanceLayoutProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isTiny: boolean;
  isAdvanced: boolean;
  widgetKey: string;
  hideFooter: boolean;
}

export function SingleInstanceLayout({
  instance,
  options,
  isTiny,
  isAdvanced,
  widgetKey,
  hideFooter,
}: SingleInstanceLayoutProps) {
  const t = useI18n("widget.coolify");
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${widgetKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${widgetKey}`,
    defaultValue: ["applications"],
  });
  const [advancedOpenSections, setAdvancedOpenSections] = useState(["servers", "applications", "services"]);
  const serverResourceCounts = buildServerResourceCounts(
    instance.instanceInfo.servers,
    instance.instanceInfo.applications,
    instance.instanceInfo.services,
  );

  const baseUrl = getSafeApplicationUrl(instance.integrationUrl)?.replace(/\/+$/, "") ?? "";
  const displayUrl = baseUrl ? baseUrl.replace(/^https?:\/\//, "") : "—";
  return (
    <ScrollArea h="100%">
      <Stack gap={0}>
        <Group p="xs" justify="center" gap="xs" style={{ borderBottom: `2px solid ${COOLIFY_BRAND_COLOR}` }}>
          <Group gap={2}>
            <Image src={COOLIFY_ICON_URL} alt="Coolify" w={isTiny ? 18 : 24} h={isTiny ? 18 : 24} />
            <Text fz={isTiny ? "xs" : "sm"} fw={700} style={{ color: COOLIFY_BRAND_COLOR }}>
              oolify
            </Text>
          </Group>
          <Stack gap={0} miw={0}>
            {isAdvanced && (
              <Text fz="xs" fw={600} truncate="end">
                {instance.integrationName}
              </Text>
            )}
            <Anchor
              component={baseUrl ? "a" : "span"}
              href={baseUrl}
              target={baseUrl ? "_blank" : undefined}
              rel={baseUrl ? SAFE_NEW_TAB_REL : undefined}
              fz={isTiny ? "xs" : "sm"}
              fw={500}
              c="dimmed"
              lineClamp={1}
            >
              {isAdvanced ? t("source.url", { url: displayUrl }) : displayUrl}
            </Anchor>
          </Stack>
        </Group>

        <Accordion
          className={classes.accordion}
          variant="contained"
          chevronPosition="right"
          multiple
          keepMounted={false}
          value={isAdvanced ? advancedOpenSections : openSections}
          onChange={isAdvanced ? setAdvancedOpenSections : setOpenSections}
        >
          {options.showServers && (
            <ServersSection
              servers={instance.instanceInfo.servers}
              serverResourceCounts={serverResourceCounts}
              baseUrl={baseUrl}
              isTiny={isTiny}
              isAdvanced={isAdvanced}
              showIp={showIp}
              onToggleIp={() => setShowIp((prev) => !prev)}
            />
          )}
          {options.showApplications && (
            <ApplicationsSection applications={instance.instanceInfo.applications} baseUrl={baseUrl} isTiny={isTiny} />
          )}
          {options.showServices && (
            <ServicesSection
              services={instance.instanceInfo.services}
              baseUrl={baseUrl}
              isTiny={isTiny}
              isAdvanced={isAdvanced}
            />
          )}
        </Accordion>

        {!hideFooter && <InstanceFooter version={instance.instanceInfo.version} updatedAt={instance.updatedAt} />}
      </Stack>
    </ScrollArea>
  );
}

const InstanceFooter = ({ version, updatedAt }: { version: string; updatedAt: Date }) => {
  const t = useI18n("widget.coolify");
  const relativeTime = useTimeAgo(updatedAt, 60_000);
  return (
    <Group justify="space-between" p={4} className={classes.neutralDividerTop}>
      <Group gap={2}>
        <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
        <Text size="xs" c="dimmed">
          v{version}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {t("footer.updated", { when: relativeTime })}
      </Text>
    </Group>
  );
};
