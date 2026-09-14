import { getPageDescription } from "@/lib/page-description";
import { source } from "@/lib/source";

import { DirectoryGrid } from "./directory-grid";

const sectionLabels = {
  integrations: "integration guides",
  widgets: "widget guides",
} as const;

interface DocsDirectoryProps {
  section: keyof typeof sectionLabels;
}

export async function DocsDirectory({ section }: DocsDirectoryProps) {
  const pages = source.getPages().filter((page) => page.slugs[0] === section && page.slugs.length === 2);
  const items = (
    await Promise.all(
      pages.map(async (page) => ({
        description: await getPageDescription(page),
        title: page.data.title,
        url: page.url,
      })),
    )
  ).toSorted((a, b) => a.title.localeCompare(b.title));

  return <DirectoryGrid items={items} label={sectionLabels[section]} />;
}
