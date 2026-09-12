"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button, Group, Select, Stack, Tabs, Text, TextInput, Alert, Collapse, Tree, useTree } from "@mantine/core";
import { IconPlus, IconTrash, IconChevronRight, IconCode, IconFolder, IconFolderOpen } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { documentFromTemplate } from "@homarr/custom-widgets/workbench/package";
import type { usePackageWorkspace } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";
import type { TreeNodeData } from "@mantine/core";

const PackageLanguageEditor = dynamic(() => import("./_package-language-editor"), { ssr: false });
export function PackageSourceEditor({
  state,
  existing,
}: {
  state: ReturnType<typeof usePackageWorkspace>;
  existing: boolean;
}) {
  const t = useI18n("customWidget.package");
  const [filesOpen, setFilesOpen] = useState(true);
  const [manageFiles, setManageFiles] = useState(false);
  const { document, edit, selected, setSelected, path, setPath, busy, addFile, renameFile, removeFile, parsed } = state;
  return (
    <Tabs.Panel value="source" pt="md">
      <Stack>
        {!existing && (
          <Select
            label={t("starter")}
            description={t("starterDescription")}
            placeholder={t("chooseStarter")}
            data={Object.entries(widgetReferencePackages).map(([key, template]) => ({
              value: key,
              label: template.manifest.name,
            }))}
            disabled={busy}
            onChange={(starter) => {
              if (!starter) return;
              const template = Object.entries(widgetReferencePackages).find(([key]) => key === starter)?.[1];
              if (!template) return;
              edit(documentFromTemplate(document.name, template));
              setSelected(template.manifest.entrypoints.tile);
            }}
          />
        )}
        <Group gap="xs">
          <Select
            flex={1}
            searchable
            aria-label={t("filePath")}
            value={selected}
            data={[
              { value: "/widget.json", label: t("manifestFile") },
              ...Object.keys(document.files)
                .toSorted()
                .map((file) => ({ value: file, label: file })),
            ]}
            onChange={(value) => {
              if (value) setSelected(value);
            }}
          />
          <Button variant="subtle" size="sm" onClick={() => setFilesOpen(!filesOpen)} aria-expanded={filesOpen}>
            {t("files")}
          </Button>
        </Group>
        <div className={classes.editor} data-package-document data-files-open={filesOpen}>
          {filesOpen && (
            <Stack gap="xs" className={classes.files}>
              <PackageFileTree files={document.files} selected={selected} onSelect={setSelected} />
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => setManageFiles((value) => !value)}
                aria-expanded={manageFiles}
              >
                {t("manageFiles")}
              </Button>
              <Collapse expanded={manageFiles}>
                <Stack gap="xs">
                  <TextInput
                    aria-label={t("filePath")}
                    placeholder={t("filePathExample")}
                    value={path}
                    onChange={(event) => setPath(event.currentTarget.value)}
                    disabled={busy}
                  />
                  <Group gap={4}>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      leftSection={<IconPlus size={12} />}
                      onClick={addFile}
                      disabled={busy || !path.trim()}
                    >
                      {t("addFile")}
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={renameFile}
                      disabled={busy || !path.trim() || selected === "/widget.json"}
                    >
                      {t("renameFile")}
                    </Button>
                    <Button
                      size="compact-xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={12} />}
                      onClick={removeFile}
                      disabled={busy || selected === "/widget.json"}
                    >
                      {t("removeFile")}
                    </Button>
                  </Group>
                </Stack>
              </Collapse>
            </Stack>
          )}
          <PackageLanguageEditor state={state} />
        </div>
        {!parsed.success && (
          <Alert color="yellow">
            <Text fw={500}>{t("draftInvalid")}</Text>
            {parsed.error.issues.slice(0, 8).map((issue, index) => (
              <Text key={index} size="sm">
                {issue.path.join(".")}: {issue.message}
              </Text>
            ))}
          </Alert>
        )}
      </Stack>
    </Tabs.Panel>
  );
}

function PackageFileTree({
  files,
  selected,
  onSelect,
}: {
  files: Record<string, string>;
  selected: string;
  onSelect(path: string): void;
}) {
  const t = useI18n("customWidget.package");
  const data = useMemo(() => {
    const roots: TreeNodeData[] = [{ value: "/widget.json", label: t("manifestFile") }];
    for (const path of Object.keys(files).toSorted()) {
      const parts = path.split("/");
      let siblings = roots;
      let prefix = "";
      for (const [index, label] of parts.entries()) {
        prefix += label;
        if (index === parts.length - 1) {
          siblings.push({ value: path, label });
          break;
        }
        prefix += "/";
        let folder = siblings.find((node) => node.value === prefix);
        if (!folder) {
          folder = { value: prefix, label, children: [] };
          siblings.push(folder);
        }
        siblings = folder.children ?? [];
      }
    }
    return roots;
  }, [files, t]);
  const tree = useTree({
    selectedState: [selected],
    onSelectedStateChange: (values) => {
      const value = values[0];
      if (value && !value.endsWith("/")) onSelect(value);
    },
  });
  return (
    <Tree
      aria-label={t("files")}
      data={data}
      tree={tree}
      levelOffset={16}
      selectOnClick
      renderNode={({ node, expanded, hasChildren, elementProps }) => {
        let Icon = IconCode;
        if (hasChildren) Icon = IconFolder;
        if (hasChildren && expanded) Icon = IconFolderOpen;
        return (
          <Group {...elementProps} gap={6} wrap="nowrap" py={5} title={node.value}>
            {hasChildren && <IconChevronRight size={12} style={{ transform: `rotate(${expanded ? 90 : 0}deg)` }} />}
            <Icon size={16} style={{ flexShrink: 0 }} />
            <Text size="xs" truncate>
              {node.label}
            </Text>
          </Group>
        );
      }}
    />
  );
}
