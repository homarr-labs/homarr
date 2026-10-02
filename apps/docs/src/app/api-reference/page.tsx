import { Carbon } from "@/components/carbon";
import { IconArrowRight } from "@tabler/icons-react";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { DocsPage } from "fumadocs-ui/layouts/docs/page";

import { apiSource } from "@/lib/openapi";

export const metadata = pageMetadata({
  path: "/api-reference",
  title: "API reference",
  description: "Interactive reference for Homarr's HTTP API.",
});

export default function ApiReferenceIndexPage() {
  const pages = apiSource.getPages();

  return (
    <DocsPage full breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <header className="homarr-content-header max-w-2xl">
        <p className="text-sm font-medium text-fd-primary">OpenAPI</p>
        <h1 className="homarr-content-title mt-2">Homarr API reference</h1>
        <p className="homarr-content-lead">
          Browse request parameters and response schemas, enter your Homarr instance’s full URL in Server URL, then
          review examples or send a test request from your browser.
        </p>
      </header>
      <div className="mt-10 divide-y border-y">
        {pages.map((page) => (
          <Link key={page.url} href={page.url} className="group flex items-center gap-3 py-4 hover:bg-fd-accent/50">
            <span className="min-w-0 flex-1 truncate font-medium">{page.data.title}</span>
            <IconArrowRight className="text-fd-muted-foreground" aria-hidden size={17} />
          </Link>
        ))}
      </div>
      <Carbon />
    </DocsPage>
  );
}
