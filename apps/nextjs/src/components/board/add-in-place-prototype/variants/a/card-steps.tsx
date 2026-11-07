"use client";

import type { ReactNode } from "react";
import { Box, Button, Group, Image, Text, UnstyledButton } from "@mantine/core";
import { IconApps, IconArrowLeft, IconWand, IconX } from "@tabler/icons-react";

import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import { getTargetKind } from "../../store";
import type { PickTarget } from "../../types";
import type { AddInPlacePanelProps } from "../contract";
import classes from "./panel.module.css";
import { KeyboardHints } from "./keyboard-hints";

const submitVariables = () => ({
  root: {
    "--button-bg": "color-mix(in srgb, var(--mantine-primary-color-filled) 85%, black)",
    "--button-hover": "color-mix(in srgb, var(--mantine-primary-color-filled) 80%, black)",
    "--button-color": "white",
  },
});

const focusConfirm = (button: HTMLButtonElement | null) => button?.focus({ preventScroll: true });

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onBack?: () => void;
  onClose: () => void;
}

const CardHeader = ({ icon, title, subtitle, onBack, onClose }: CardHeaderProps) => (
  <Group className={classes.header} gap="sm" wrap="nowrap">
    <Box className={classes.headerIcon}>{icon}</Box>
    <Box className={classes.headerText}>
      <Text fw={600} size="sm" lh={1.25} truncate>
        {title}
      </Text>
      <Text size="xs" lh={1.3} truncate>
        {subtitle}
      </Text>
    </Box>
    {onBack && (
      <UnstyledButton className={classes.backButton} onClick={onBack}>
        <IconArrowLeft size={14} />
        Back
      </UnstyledButton>
    )}
    <UnstyledButton className={classes.closeButton} onClick={onClose} aria-label="Close">
      <IconX size={15} />
    </UnstyledButton>
  </Group>
);

const useTargetIdentity = (target: PickTarget | undefined, useCatalog: AddInPlacePanelProps["useCatalog"]) => {
  const t = useI18n();
  const catalog = useCatalog("");
  if (!target) return { name: "Widget", icon: <IconWand size={20} stroke={1.5} /> };

  const kind = getTargetKind(target);
  const Icon = widgetCatalogIcons[kind];

  if (target.type === "app") {
    const entry = catalog.entries.find((candidate) => candidate.type === "app" && candidate.appId === target.appId);
    const iconUrl = entry?.type === "app" ? entry.iconUrl : null;
    const icon = iconUrl ? <Image src={iconUrl} w={22} h={22} fit="contain" alt="" /> : <IconApps size={20} />;
    return { name: target.name, icon };
  }
  if (target.type === "custom") return { name: target.name, icon: <Icon size={20} stroke={1.5} /> };
  return { name: getWidgetName(kind, t), icon: <Icon size={20} stroke={1.5} /> };
};

type ConfigureStepProps = Pick<
  AddInPlacePanelProps,
  "session" | "actions" | "useCatalog" | "BoundEditorForm" | "AreaSizeInputs" | "editorFormId"
>;

export const ConfigureStep = ({
  session,
  actions,
  useCatalog,
  BoundEditorForm,
  AreaSizeInputs,
  editorFormId,
}: ConfigureStepProps) => {
  const isEdit = session.mode === "edit";
  const identity = useTargetIdentity(session.picked, useCatalog);

  return (
    <>
      <CardHeader
        icon={identity.icon}
        title={identity.name}
        subtitle={isEdit ? "Editing widget" : "Configure widget"}
        onBack={isEdit ? undefined : actions.back}
        onClose={() => actions.cancel()}
      />
      <Box className={classes.body}>
        <BoundEditorForm />
      </Box>
      <Group className={classes.footer} justify="space-between" wrap="wrap" gap={8}>
        <AreaSizeInputs compact />
        <Group gap="xs" wrap="nowrap">
          <Button variant="default" size="sm" px="sm" onClick={() => actions.cancel()}>
            Cancel
          </Button>
          <Button
            ref={focusConfirm}
            data-autofocus
            data-widget-confirm
            size="sm"
            px="sm"
            type="submit"
            form={editorFormId}
            vars={submitVariables}
          >
            {isEdit ? "Save" : "Add"}
          </Button>
        </Group>
        <KeyboardHints configuring />
      </Group>
    </>
  );
};

type CreateAppStepProps = Pick<AddInPlacePanelProps, "actions" | "CreateAppForm">;

export const CreateAppStep = ({ actions, CreateAppForm }: CreateAppStepProps) => (
  <>
    <CardHeader
      icon={<IconApps size={20} stroke={1.5} />}
      title="Create app"
      subtitle="Saved to your apps and placed here"
      onBack={() => actions.back()}
      onClose={() => actions.cancel()}
    />
    <Box className={classes.body}>
      <CreateAppForm />
    </Box>
  </>
);
