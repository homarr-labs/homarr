"use client";
import { useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import {
  IconAppWindow,
  IconCode,
  IconChevronDown,
  IconExternalLink,
  IconPlugConnected,
  IconSparkles,
  IconWorld,
} from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { useConfirmModal } from "@homarr/modals";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { createFlowCommands } from "./commands";
import { createHttpStarterTemplate } from "./start-templates";

const choiceStyles = {
  root: { height: "auto", padding: "8px 10px" },
  label: { whiteSpace: "normal", textAlign: "left" },
} as const;

export function WorkbenchStart({
  form,
  onSelect,
  onAssistant,
  onIntegration,
}: {
  form: CustomWidgetWorkbenchForm;
  onSelect(id: string): void;
  onAssistant(): void;
  onIntegration(): void;
}) {
  const store = useCustomWidgetFormDocumentStore();
  const [opened, setOpened] = useState(() => !store.getDirty());
  const t = useI18n("customWidget.flow");
  const { openConfirmModal } = useConfirmModal();
  const start = (http: boolean, after?: () => void) => {
    const apply = () => {
      store.transaction(() => {
        form.setValues({
          ...store.getValues(),
          sources: "{}",
          requests: "{}",
          options: "{}",
          extensions: "",
          secrets: [],
          template:
            '<Stack align="center" justify="center" h="100%"><Text size="xl" fw={600}>{' +
            JSON.stringify(t("welcomeTemplate")) +
            "}</Text></Stack>",
        });
        store.setLayout({ version: 1, nodes: {}, groups: {} });
        if (http) {
          const id = createFlowCommands(form, store).add("query");
          form.setFieldValue(
            "template",
            createHttpStarterTemplate(id.replace(/^request:/u, ""), t("httpResponse"), t("httpSetupHint")),
          );
          onSelect("source:default");
        } else onSelect("widget");
        after?.();
      });
      setOpened(false);
    };
    if (!store.getDirty()) {
      apply();
      return;
    }
    openConfirmModal({ title: t("startOver"), children: t("startOverDescription"), onConfirm: apply });
  };
  const embed = () =>
    start(false, () => {
      store.transaction(() => {
        form.setFieldValue("extensions", "{}");
        form.setFieldValue(
          "options",
          JSON.stringify({ appUrl: { control: "url", label: t("embedUrl"), default: "" } }, null, 2),
        );
        form.setFieldValue(
          "template",
          "{options.appUrl ? <AppEmbed src={options.appUrl} title=" +
            JSON.stringify(t("embeddedApp")) +
            " /> : <Alert>{" +
            JSON.stringify(t("configureEmbed")) +
            "}</Alert>}",
        );
      });
      onSelect("options");
    });
  const choices = [
    {
      key: "describe",
      label: "describe",
      icon: IconSparkles,
      onClick: () => {
        setOpened(false);
        onAssistant();
      },
    },
    {
      key: "integration",
      label: "useIntegration",
      icon: IconPlugConnected,
      onClick: () =>
        start(false, () => {
          onSelect("native:new");
          onIntegration();
        }),
    },
    { key: "http", label: "connectHttp", icon: IconWorld, onClick: () => start(true) },
    { key: "static", label: "withoutData", icon: IconCode, onClick: () => start(false) },
    { key: "embed", label: "embedApp", icon: IconAppWindow, onClick: embed },
  ] as const;
  return (
    <Stack gap="xs" mb="md">
      <Button
        type="button"
        variant="subtle"
        size="compact-xs"
        justify="start"
        aria-expanded={opened}
        onClick={() => setOpened((current) => !current)}
        rightSection={<IconChevronDown size={14} style={{ transform: opened ? "rotate(180deg)" : undefined }} />}
      >
        {t("startingPoints")}
      </Button>
      {opened && (
        <Stack gap={6}>
          {choices.map(({ key, label, icon: Icon, onClick }) => (
            <Button
              key={key}
              type="button"
              size="xs"
              variant="default"
              fullWidth
              justify="start"
              styles={choiceStyles}
              leftSection={<Icon size={18} />}
              onClick={onClick}
            >
              <span>
                <Text component="span" display="block" size="xs" fw={600}>
                  {t(label)}
                </Text>
                <Text component="span" display="block" size="xs" fw={400} c="dimmed">
                  {t(`startDescription.${key}`)}
                </Text>
              </span>
            </Button>
          ))}
          <Button
            size="xs"
            variant="default"
            component="a"
            href="/manage/custom-widgets/workshop"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(false)}
            fullWidth
            justify="start"
            styles={choiceStyles}
            leftSection={<IconExternalLink size={18} />}
          >
            <span>
              <Text component="span" display="block" size="xs" fw={600}>
                {t("browseWorkshop")}
              </Text>
              <Text component="span" display="block" size="xs" fw={400} c="dimmed">
                {t("startDescription.workshop")}
              </Text>
            </span>
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
