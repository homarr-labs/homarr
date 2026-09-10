import { source } from "@/lib/source";

import { DirectoryGrid } from "./directory-grid";

const sectionLabels = {
  integrations: "integration guides",
  widgets: "widget guides",
} as const;

interface DocsDirectoryProps {
  section: keyof typeof sectionLabels;
}

export function DocsDirectory({ section }: DocsDirectoryProps) {
  const items = source
    .getPages()
    .filter((page) => page.slugs[0] === section && page.slugs.length === 2)
    .map((page) => ({
      description: page.data.description,
      title: page.data.title,
      url: page.url,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return <DirectoryGrid items={items} label={sectionLabels[section]} />;
}
