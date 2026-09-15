import { getDocsHref } from "@/lib/docs-path";
import { WidgetDefinition } from "@site/src/types";
import { IconArrowRight, type TablerIcon } from "@tabler/icons-react";
import Link from "next/link";

interface IntegrationCapabilitesProps {
  items: (
    | {
        widget: WidgetDefinition;
        note?: string;
      }
    | {
        capability: {
          icon: TablerIcon;
          name: string;
          description: string;
          path: string;
        };
        note?: string;
      }
  )[];
}

export const IntegrationCapabilites = ({ items }: IntegrationCapabilitesProps) => {
  return (
    <div className="not-prose mt-4 grid w-full gap-2">
      <div className="grid gap-2">
        {items.map((item) => {
          const capability = "widget" in item ? item.widget : item.capability;

          return (
            <div
              key={capability.name}
              className="flex flex-col gap-4 rounded-xl border bg-fd-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-fd-primary/10 text-fd-primary">
                  <capability.icon aria-hidden="true" size={24} stroke={1.5} />
                </div>

                <div className="min-w-0">
                  <span className="block text-base font-semibold text-fd-foreground">{capability.name}</span>
                  <span className="mt-1 block text-sm leading-5 text-fd-muted-foreground">
                    {capability.description}
                  </span>
                  {item.note && <span className="mt-1 block text-xs text-fd-muted-foreground">{item.note}</span>}
                </div>
              </div>

              <Link
                href={getDocsHref(capability.path)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-muted hover:no-underline"
              >
                View guide
                <IconArrowRight aria-hidden="true" size={16} stroke={1.5} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
