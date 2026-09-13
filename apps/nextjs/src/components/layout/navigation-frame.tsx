"use client";

import type { PropsWithChildren } from "react";
import { ActionIcon, AppShellNavbar, AppShellSection, Group, Text, Tooltip } from "@mantine/core";
import { useFocusReturn, useFocusTrap } from "@mantine/hooks";
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { useManagementNavigation } from "./navigation-context";

export function NavigationFrame({ children }: PropsWithChildren) {
  const navigation = useManagementNavigation();
  const t = useI18n("management.navbar");
  const focusTrap = useFocusTrap(navigation?.mobileOpened ?? false);
  useFocusReturn({ opened: navigation?.mobileOpened ?? false });
  let toggleLabel = t("collapse");
  let ToggleIcon = IconLayoutSidebarLeftCollapse;
  let padding: number | "md" = "md";
  if (navigation?.compact) {
    toggleLabel = t("expand");
    ToggleIcon = IconLayoutSidebarLeftExpand;
    padding = 11;
  }

  return (
    <AppShellNavbar
      ref={focusTrap}
      id="main-navigation"
      aria-label={t("label")}
      data-compact={navigation?.compact || undefined}
      inert={navigation?.mobile && !navigation.mobileOpened}
      aria-hidden={(navigation?.mobile && !navigation.mobileOpened) || undefined}
      p={padding}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || !navigation?.mobileOpened) return;
        event.preventDefault();
        event.stopPropagation();
        navigation.closeMobile();
      }}
    >
      {navigation && (
        <AppShellSection mb="sm">
          <Group gap={0} justify="space-between" wrap="nowrap">
            {!navigation.compact && (
              <Text size="xs" fw={500}>
                {t("label")}
              </Text>
            )}
            {!navigation.mobile && (
              <Tooltip label={toggleLabel} position="right" events={{ hover: true, focus: true, touch: false }}>
                <ActionIcon
                  size={40}
                  variant="subtle"
                  color="gray"
                  aria-label={toggleLabel}
                  aria-expanded={!navigation.compact}
                  aria-controls="main-navigation-links"
                  onClick={navigation.toggle}
                >
                  <ToggleIcon size={20} />
                </ActionIcon>
              </Tooltip>
            )}
            {navigation.mobile && (
              <ActionIcon
                size={40}
                variant="subtle"
                color="gray"
                data-autofocus
                aria-label={t("closeNavigation")}
                onClick={navigation.closeMobile}
              >
                <IconX size={20} />
              </ActionIcon>
            )}
          </Group>
        </AppShellSection>
      )}
      {children}
    </AppShellNavbar>
  );
}
