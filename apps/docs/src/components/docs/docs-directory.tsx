import { integrationDefs } from "@homarr/definitions";

import { dockerIntegration } from "@site/docs/integrations/docker";
import { kubernetesIntegration } from "@site/docs/integrations/kubernetes";

import { getPageDescription } from "@/lib/page-description";
import { source } from "@/lib/source";

import { DirectoryGrid } from "./directory-grid";

const sectionLabels = {
  integrations: "integration guides",
  widgets: "widget guides",
} as const;

const integrationIconsBySlug = Object.values(integrationDefs).reduce<Record<string, string>>((icons, definition) => {
  if (definition.documentationSlug) icons[definition.documentationSlug] = definition.iconUrl;
  return icons;
}, {});

Object.assign(integrationIconsBySlug, {
  docker: dockerIntegration.iconUrl,
  "docker-labels": dockerIntegration.iconUrl,
  kubernetes: kubernetesIntegration.iconUrl,
});

interface DocsDirectoryProps {
  section: keyof typeof sectionLabels;
}

export async function DocsDirectory({ section }: DocsDirectoryProps) {
  const pages = source.getPages().filter((page) => page.slugs[0] === section && page.slugs.length === 2);
  const items = (
    await Promise.all(
      pages.map(async (page) => ({
        description: await getPageDescription(page),
        iconUrl: section === "integrations" ? integrationIconsBySlug[page.slugs[1]] : undefined,
        title: page.data.title,
        url: page.url,
      })),
    )
  ).toSorted((a, b) => a.title.localeCompare(b.title));

  return <DirectoryGrid items={items} label={sectionLabels[section]} />;
}
