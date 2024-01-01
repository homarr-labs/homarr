"use client";

import type { PropsWithChildren } from "react";
import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/definitions";
import { Accordion } from "@homarr/ui";

type IntegrationGroupAccordionControlProps = PropsWithChildren<{
  activeTab: IntegrationKind | undefined;
}>;

export const IntegrationGroupAccordion = ({
  children,
  activeTab,
}: IntegrationGroupAccordionControlProps) => {
  const router = useRouter();

  return (
    <Accordion
      variant="separated"
      defaultValue={activeTab}
      onChange={(v) =>
        v ? router.replace(`?tab=${v}`, {}) : router.replace("/integrations")
      }
    >
      {children}
    </Accordion>
  );
};
