"use client";

import { Button } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import {
  IconAlertCircle,
  IconApi,
  IconBraces,
  IconCode,
  IconDatabase,
  IconEye,
  IconSettings,
} from "@tabler/icons-react";

import type { CustomWidgetSectionId, CustomWidgetSectionNavigationProps } from "./contracts";
import classes from "./custom-widget-form.module.css";

const sectionLinks: readonly [CustomWidgetSectionId, Icon][] = [
  ["general", IconSettings],
  ["sources", IconApi],
  ["requests", IconDatabase],
  ["options", IconBraces],
  ["jsx", IconCode],
  ["preview", IconEye],
];

export function CustomWidgetSectionNavigation({ onSelect, invalidSections, copy }: CustomWidgetSectionNavigationProps) {
  return (
    <nav className={classes.sectionNav} aria-label={copy.sectionNavigation}>
      {sectionLinks.map(([id, SectionIcon]) => {
        const invalid = invalidSections.has(id);
        return (
          <Button
            key={id}
            component="a"
            href={`#${id}`}
            onClick={() => onSelect(id)}
            size="compact-sm"
            variant="subtle"
            color={invalid ? "red" : undefined}
            leftSection={<SectionIcon size={14} />}
            rightSection={invalid ? <IconAlertCircle size={13} aria-label={copy.invalid} /> : undefined}
          >
            {copy.sections[id]}
          </Button>
        );
      })}
    </nav>
  );
}
