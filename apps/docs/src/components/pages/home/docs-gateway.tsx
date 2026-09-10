import {
  IconArrowRight,
  IconBook2,
  IconBraces,
  IconCopy,
  IconPlugConnected,
  IconSearch,
  IconTools,
} from "@tabler/icons-react";
import Link from "next/link";

import { SectionContainer } from "@/components/pages/home/container/section-container";

const destinations = [
  {
    href: "/docs/getting-started",
    icon: IconBook2,
    title: "Install Homarr",
    description: "Choose a platform and get your first instance running.",
  },
  {
    href: "/docs/integrations",
    icon: IconPlugConnected,
    title: "Connect integrations",
    description: "Add the services Homarr can monitor and control.",
  },
  {
    href: "/docs/widgets",
    icon: IconTools,
    title: "Configure widgets",
    description: "See available widgets and their configuration.",
  },
  {
    href: "/api-reference",
    icon: IconBraces,
    title: "Explore the API",
    description: "Use the generated reference for supported endpoints.",
  },
] as const;

export function DocsGateway() {
  return (
    <section className="py-12 sm:py-16" aria-labelledby="docs-gateway-title">
      <SectionContainer>
        <div className="grid overflow-hidden border bg-fd-card lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between border-b p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div>
              <h2 id="docs-gateway-title" className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">
                Documentation
              </h2>
              <p className="mb-0 mt-5 max-w-lg leading-7 text-fd-muted-foreground">
                Choose a starting point, search the documentation, or use the Markdown and LLM-readable versions.
              </p>
            </div>

            <div className="mt-10 grid gap-3 text-sm">
              <div className="flex items-center gap-3 text-fd-muted-foreground">
                <IconSearch aria-hidden="true" size={18} />
                <span>Search all documentation</span>
              </div>
              <div className="flex items-center gap-3 text-fd-muted-foreground">
                <IconCopy aria-hidden="true" size={18} />
                <span>Copy or view each guide as Markdown</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  className="rounded-md bg-fd-muted px-2.5 py-1 font-mono text-xs hover:text-fd-primary"
                  href="/llms.txt"
                >
                  /llms.txt
                </a>
                <a
                  className="rounded-md bg-fd-muted px-2.5 py-1 font-mono text-xs hover:text-fd-primary"
                  href="/llms-full.txt"
                >
                  /llms-full.txt
                </a>
              </div>
            </div>
          </div>

          <nav aria-label="Documentation starting points">
            {destinations.map(({ href, icon: Icon, title, description }) => (
              <Link
                key={href}
                href={href}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b p-5 text-fd-foreground transition-colors last:border-b-0 hover:bg-fd-muted/70 sm:p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-fd-muted text-fd-primary">
                  <Icon aria-hidden="true" size={21} />
                </span>
                <span>
                  <strong className="block text-sm font-semibold">{title}</strong>
                  <span className="mt-1 block text-sm leading-5 text-fd-muted-foreground">{description}</span>
                </span>
                <IconArrowRight
                  aria-hidden="true"
                  className="text-fd-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-fd-primary"
                  size={19}
                />
              </Link>
            ))}
          </nav>
        </div>
      </SectionContainer>
    </section>
  );
}
