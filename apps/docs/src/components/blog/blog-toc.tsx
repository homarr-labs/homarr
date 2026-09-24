"use client";

import { IconList } from "@tabler/icons-react";
import type { TOCItemType } from "fumadocs-core/toc";
import { TOCItem, TOCItems } from "fumadocs-ui/components/toc/default";
import { TOCProvider, TOCScrollArea } from "fumadocs-ui/components/toc";

export function BlogToc({ items }: { items: TOCItemType[] }) {
  if (items.length === 0) return null;

  return (
    <TOCProvider toc={items}>
      <aside
        className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] min-w-0 self-start xl:block"
        aria-labelledby="blog-toc-title"
      >
        <h2 id="blog-toc-title" className="flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
          <IconList aria-hidden size={16} />
          On this page
        </h2>
        <TOCScrollArea className="mt-3 max-h-[calc(100dvh-11rem)]">
          <TOCItems>
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </TOCItems>
        </TOCScrollArea>
      </aside>
    </TOCProvider>
  );
}
