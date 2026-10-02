"use client";

import { useColorMode } from "@/hooks/use-color-mode";
import { getDocsHref } from "@/lib/docs-path";
import { IntegrationDefinition } from "@site/src/types";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";
import { getIntegrationIconUrl } from "../integrations/header";

interface WidgetIntegrationsProps {
  items: {
    integration: IntegrationDefinition;
    note?: string;
  }[];
}

export const WidgetIntegrations = ({ items }: WidgetIntegrationsProps) => {
  const { isDarkTheme } = useColorMode();

  return (
    <div className="not-prose mt-4 grid w-full gap-2">
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.integration.name}
            className="flex flex-col gap-4 rounded-xl border bg-fd-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-4 sm:items-center">
              <img
                width={40}
                height={40}
                src={getIntegrationIconUrl(item.integration, isDarkTheme)}
                alt={`${item.integration.name} icon`}
                className="size-10 shrink-0 object-contain"
              />

              <div className="min-w-0">
                <span className="block text-base font-semibold text-fd-foreground">{item.integration.name}</span>
                <span className="mt-1 block text-sm leading-5 text-fd-muted-foreground">
                  {item.integration.description}
                </span>
                {item.note && <span className="mt-1 block text-xs text-fd-muted-foreground">{item.note}</span>}
              </div>
            </div>

            <Link
              href={getDocsHref(item.integration.path)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-muted hover:no-underline"
            >
              View guide
              <IconArrowRight aria-hidden="true" size={16} stroke={1.5} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
