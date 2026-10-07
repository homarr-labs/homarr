import { Carbon } from "@/components/carbon";
import { IconArrowRight } from "@tabler/icons-react";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { DocsPage } from "fumadocs-ui/layouts/docs/page";

import { apiTaskPages } from "@/lib/openapi";

export const metadata = pageMetadata({
  path: "/api-reference",
  title: "API reference",
  description: "Interactive reference for Homarr's HTTP API.",
});

export default function ApiReferenceIndexPage() {
  return (
    <DocsPage full breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <header className="homarr-content-header max-w-2xl">
        <p className="text-sm font-medium text-fd-primary">OpenAPI</p>
        <h1 className="homarr-content-title mt-2">Homarr API reference</h1>
        <p className="homarr-content-lead">
          Choose what you want to automate. Each operation includes complete inputs, responses and authentication, with
          examples you can run against your instance.
        </p>
      </header>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {apiTaskPages.map((task) => (
          <section key={task.id} id={task.id} className="min-w-0 rounded-xl border bg-fd-card p-5">
            <h2 className="text-lg font-semibold">{task.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{task.description}</p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-fd-primary">
                {task.pages.length} operations
              </summary>
              <div className="mt-3 divide-y border-t">
                {task.pages.map(({ page, method, path }) => (
                  <Link
                    key={page.url}
                    href={page.url}
                    className="group flex items-center gap-3 py-3 hover:bg-fd-accent/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{page.data.title}</span>
                      <span className="mt-1 block break-all font-mono text-xs text-fd-muted-foreground">
                        {method} {path}
                      </span>
                    </span>
                    <IconArrowRight className="shrink-0 text-fd-muted-foreground" aria-hidden size={17} />
                  </Link>
                ))}
              </div>
            </details>
          </section>
        ))}
      </div>
      <Carbon />
    </DocsPage>
  );
}
