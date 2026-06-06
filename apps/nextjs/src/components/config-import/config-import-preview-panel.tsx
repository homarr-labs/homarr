"use client";

import { Alert, Group, List, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { ConfigImportPreview } from "@homarr/board-portability";

import { ConfigSummaryList } from "./config-summary-list";

const compatibilityAlertColor: Record<ConfigImportPreview["compatibility"]["status"], string> = {
  compatible: "blue",
  unsupportedVersion: "red",
  invalidStructure: "red",
};

type CountSection = { labelKey: string; entries: { key: string; count: number }[] };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const buildCountSections = (preview: ConfigImportPreview): CountSection[] => [
  {
    labelKey: "management.page.importExport.preview.importWillReuse",
    entries: Object.entries(preview.toReuse)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key: `management.page.importExport.preview.reuse${capitalize(key)}`, count })),
  },
  {
    labelKey: "management.page.importExport.preview.importWillSkip",
    entries: Object.entries(preview.toSkip)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key: `management.page.importExport.preview.skip${capitalize(key)}`, count })),
  },
  {
    labelKey: "management.page.importExport.preview.importWillUpdate",
    entries: Object.entries(preview.toUpdate)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key: `management.page.importExport.preview.update${capitalize(key)}`, count })),
  },
];

type ConfigImportPreviewPanelProps = {
  preview: ConfigImportPreview | undefined;
  previewLoading: boolean;
  t: (key: string, values?: Record<string, unknown>) => string;
};

export const ConfigImportPreviewPanel = ({ preview, previewLoading, t }: ConfigImportPreviewPanelProps) => {
  if (!preview && !previewLoading) {
    return null;
  }

  const importAllowed = preview?.compatibility.status === "compatible";

  return (
    <Stack gap="sm">
      {previewLoading && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            {t("management.page.importExport.preview.importLoading")}
          </Text>
        </Group>
      )}

      {preview && (
        <>
          <Alert
            variant="light"
            color={compatibilityAlertColor[preview.compatibility.status]}
            icon={<IconAlertTriangle size="1rem" stroke={1.5} />}
            title={
              preview.compatibility.status === "compatible"
                ? t("management.page.importExport.preview.migrationNote", {
                    bundleVersion: preview.meta.bundleVersion || "?",
                  })
                : t("management.page.importExport.preview.importIncompatible")
            }
          >
            {preview.compatibility.status === "compatible" && preview.meta.exportedAt && (
              <Text size="sm" mb="xs">
                {t("management.page.importExport.preview.importMeta", {
                  exportedAt: preview.meta.exportedAt,
                  homarrVersion: preview.meta.homarrVersion,
                  bundleVersion: preview.meta.bundleVersion,
                })}
              </Text>
            )}
            {preview.compatibility.issues.length > 0 && (
              <List size="sm" spacing={4}>
                {preview.compatibility.issues.map((issue) => (
                  <List.Item key={issue}>{issue}</List.Item>
                ))}
              </List>
            )}
          </Alert>

          {importAllowed && (
            <>
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  {t("management.page.importExport.preview.importWillCreate")}
                </Text>
                <ConfigSummaryList counts={preview.toCreate} t={t} />
              </Stack>

              {buildCountSections(preview)
                .filter((section) => section.entries.length > 0)
                .map((section) => (
                  <Stack gap="xs" key={section.labelKey}>
                    <Text size="sm" fw={500}>
                      {t(section.labelKey)}
                    </Text>
                    <List size="sm">
                      {section.entries.map((entry) => (
                        <List.Item key={entry.key}>
                          {t(entry.key, { count: entry.count })}
                        </List.Item>
                      ))}
                    </List>
                  </Stack>
                ))}

              {preview.warnings.length > 0 && (
                <Alert color="yellow" variant="light" icon={<IconAlertTriangle size="1rem" />}>
                  <List size="sm">
                    {preview.warnings.map((warning) => (
                      <List.Item key={warning}>{warning}</List.Item>
                    ))}
                  </List>
                </Alert>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
};
