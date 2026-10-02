import { integrationDefs, type IntegrationKind, type WidgetKind, widgetIntegrationSupport } from "@homarr/definitions";
import { widgetDocSlugs } from "@homarr/definitions/docs/widget-doc-slugs";

import { dockerIntegration } from "@site/docs/integrations/docker";
import { kubernetesIntegration } from "@site/docs/integrations/kubernetes";

import { getPageDescription } from "@/lib/page-description";
import { source } from "@/lib/source";

import { DirectoryGrid, type DirectoryIntegration } from "./directory-grid";

const sectionLabels = {
  integrations: "integration guides",
  widgets: "widget guides",
} as const;

const integrationIconsBySlug = Object.values(integrationDefs).reduce<Record<string, string>>((icons, definition) => {
  if (definition.documentationSlug) icons[definition.documentationSlug] = definition.iconUrl;
  return icons;
}, {});

const widgetKindsBySlug = Object.entries(widgetDocSlugs).reduce<Record<string, WidgetKind>>((kinds, [kind, slug]) => {
  if (slug) kinds[slug] = kind as WidgetKind;
  return kinds;
}, {});

Object.assign(widgetKindsBySlug, { "archive-team-warrior": "archiveTeamWarrior" as WidgetKind });

const getSupportedIntegrations = (widgetKind: WidgetKind): DirectoryIntegration[] => {
  const supportedIntegrations = widgetIntegrationSupport[widgetKind] ?? [];
  const seen = new Set<IntegrationKind>();

  return supportedIntegrations.flatMap((integrationKind) => {
    if (integrationKind === "mock" || seen.has(integrationKind)) return [];
    seen.add(integrationKind);
    const integration = integrationDefs[integrationKind];
    return [{ iconUrl: integration.iconUrl, name: integration.name }];
  });
};

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
        supportedIntegrations:
          section === "widgets" && widgetKindsBySlug[page.slugs[1]]
            ? getSupportedIntegrations(widgetKindsBySlug[page.slugs[1]])
            : undefined,
        title: page.data.title,
        url: page.url,
        widgetKind: section === "widgets" ? widgetKindsBySlug[page.slugs[1]] : undefined,
      })),
    )
  ).toSorted((a, b) => a.title.localeCompare(b.title));

  return <DirectoryGrid items={items} label={sectionLabels[section]} />;
}
