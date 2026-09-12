"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { Accordion, Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { hasCompleteAssistantToolArguments } from "./assistant-human-tool-status";
import type { PackageChangesResult, ProposePackageChangesArgs } from "./assistant-package-draft-contracts";
import { packageDraftToolContracts } from "./assistant-package-draft-contracts";
import {
  applyAssistantPackageChanges,
  getAssistantPackageDraftVersion,
  getServerPackageDraftVersion,
  reviewAssistantPackageChanges,
  subscribeAssistantPackageDraft,
} from "./assistant-package-draft-registry";

const CodeEditor = dynamic(() => import("~/components/custom-widgets/code-editor").then((module) => module.CodeEditor));
type Props = ToolCallMessagePartProps<ProposePackageChangesArgs, PackageChangesResult>;

export function AssistantPackageChangesTool({ args, status, result, addResult, toolCallId }: Props) {
  const t = useI18n("customWidget.package.assistant");
  useSyncExternalStore(subscribeAssistantPackageDraft, getAssistantPackageDraftVersion, getServerPackageDraftVersion);
  if (result) return <Text size="sm">{result.applied ? t("applied") : (result.error ?? t("rejected"))}</Text>;
  if (!hasCompleteAssistantToolArguments(status)) return <Text size="sm">{t("preparing")}</Text>;
  const checked = packageDraftToolContracts.propose_widget_package_changes.parameters.safeParse(args);
  if (!checked.success) return <Alert color="red">{t("invalidProposal")}</Alert>;
  const review = reviewAssistantPackageChanges(checked.data);
  return (
    <Stack gap="sm">
      <Text fw={600}>{t("review")}</Text>
      <Text size="sm">{checked.data.summary}</Text>
      <Text size="xs" c="dimmed">
        {t("reviewDescription")}
      </Text>
      {!review.available && <Alert color="yellow">{review.error}</Alert>}
      <Accordion multiple>
        {review.changes.map((change) => (
          <Accordion.Item key={change.path} value={change.path}>
            <Accordion.Control>{change.path}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <CodeEditor
                  id={`${toolCallId}-${change.path}-before`}
                  label={t("before")}
                  value={change.before}
                  language="tsx"
                  readOnly
                  height="200px"
                  onChange={() => undefined}
                />
                <CodeEditor
                  id={`${toolCallId}-${change.path}-after`}
                  label={t("after")}
                  value={change.after}
                  language="tsx"
                  readOnly
                  height="240px"
                  onChange={() => undefined}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Group>
        <Button
          size="xs"
          disabled={!review.available || review.changes.length === 0}
          onClick={() => addResult(applyAssistantPackageChanges(checked.data))}
        >
          {t("apply")}
        </Button>
        <Button size="xs" variant="subtle" onClick={() => addResult({ applied: false, cancelled: true })}>
          {t("reject")}
        </Button>
      </Group>
    </Stack>
  );
}
