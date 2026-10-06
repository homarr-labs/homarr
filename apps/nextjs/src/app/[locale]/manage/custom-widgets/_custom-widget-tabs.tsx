"use client";

import { Tabs } from "@mantine/core";
import { IconApi, IconBuildingStore } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

const tabs = {
  installed: "/manage/custom-widgets",
  workshop: "/manage/custom-widgets/workshop",
} as const;

/** Switches between the widgets you have installed and the community Workshop. */
export const CustomWidgetTabs = ({ active }: { active: keyof typeof tabs }) => {
  const t = useI18n("customWidget.page.tabs");

  return (
    <Tabs value={tabs[active]}>
      <Tabs.List aria-label={t("ariaLabel")}>
        <Tabs.Tab
          value={tabs.installed}
          leftSection={<IconApi size={16} stroke={1.5} />}
          renderRoot={(props) => <Link href={tabs.installed} {...props} />}
        >
          {t("installed")}
        </Tabs.Tab>
        <Tabs.Tab
          value={tabs.workshop}
          leftSection={<IconBuildingStore size={16} stroke={1.5} />}
          renderRoot={(props) => <Link href={tabs.workshop} {...props} />}
        >
          {t("workshop")}
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
};
