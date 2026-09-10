import { IconArrowRight } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { apiSource } from "@/lib/openapi";

export const metadata: Metadata = {
  title: "API reference",
  description: "Interactive reference for Homarr's HTTP API.",
};

export default function ApiReferenceIndexPage() {
  const pages = apiSource.getPages();

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
      <p className="text-sm font-medium text-fd-primary">OpenAPI</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Homarr API reference</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-fd-muted-foreground">
        Browse request parameters and response schemas, then generate and test examples from the source-of-truth schema.
      </p>
      <div className="mt-10 divide-y border-y">
        {pages.map((page) => (
          <Link key={page.url} href={page.url} className="group flex items-center gap-3 py-4 hover:bg-fd-accent/50">
            <span className="min-w-0 flex-1 truncate font-medium">{page.data.title}</span>
            <IconArrowRight className="text-fd-muted-foreground" aria-hidden size={17} />
          </Link>
        ))}
      </div>
    </main>
  );
}
