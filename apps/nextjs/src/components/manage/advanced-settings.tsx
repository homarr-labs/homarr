"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Accordion } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export const AdvancedSettings = ({ children }: { children: ReactNode }) => {
  const t = useI18n("common.action");
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <Accordion value={opened} onChange={setOpened} variant="separated">
      <Accordion.Item value="advanced">
        <Accordion.Control>{t("advanced")}</Accordion.Control>
        <Accordion.Panel>{opened === "advanced" && children}</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
