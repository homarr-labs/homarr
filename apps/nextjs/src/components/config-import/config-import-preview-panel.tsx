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

              {(preview.toReuse.apps > 0 || preview.toReuse.integrations > 0) && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t("management.page.importExport.preview.importWillReuse")}
                  </Text>
                  <List size="sm">
                    {preview.toReuse.apps > 0 && (
                      <List.Item>
                        {t("management.page.importExport.preview.reuseApps", { count: preview.toReuse.apps })}
                      </List.Item>
                    )}
                    {preview.toReuse.integrations > 0 && (
                      <List.Item>
                        {t("management.page.importExport.preview.reuseIntegrations", {
                          count: preview.toReuse.integrations,
                        })}
                      </List.Item>
                    )}
                  </List>
                </Stack>
              )}

              {(preview.toSkip.boards > 0 || preview.toSkip.groups > 0 || preview.toSkip.searchEngines > 0) && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t("management.page.importExport.preview.importWillSkip")}
                  </Text>
                  <List size="sm">
                    {preview.toSkip.boards > 0 && (
                      <List.Item>
                        {t("management.page.importExport.preview.skipBoards", { count: preview.toSkip.boards })}
                      </List.Item>
                    )}
                    {preview.toSkip.groups > 0 && (
                      <List.Item>
                        {t("management.page.importExport.preview.skipGroups", { count: preview.toSkip.groups })}
                      </List.Item>
                    )}
                    {preview.toSkip.searchEngines > 0 && (
                      <List.Item>
                        {t("management.page.importExport.preview.skipSearchEngines", {
                          count: preview.toSkip.searchEngines,
                        })}
                      </List.Item>
                    )}
                  </List>
                </Stack>
              )}

              {preview.toUpdate.serverSettings > 0 && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {t("management.page.importExport.preview.importWillUpdate")}
                  </Text>
                  <List size="sm">
                    <List.Item>
                      {t("management.page.importExport.preview.updateServerSettings", {
                        count: preview.toUpdate.serverSettings,
                      })}
                    </List.Item>
                  </List>
                </Stack>
              )}

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
