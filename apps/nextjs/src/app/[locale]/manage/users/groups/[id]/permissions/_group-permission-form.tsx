"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useId } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
  Transition,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconShieldExclamation } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { objectEntries, objectKeys } from "@homarr/common";
import type { GroupPermissionKey, PermissionMatrixCategory, PermissionMatrixState } from "@homarr/definitions";
import {
  getPermissionsWithChildren,
  groupPermissionKeys,
  isCapabilityImpliedByLevel,
  matrixStateToPermissions,
  permissionMatrix,
  permissionsToMatrixState,
} from "@homarr/definitions";
import { createFormContext } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

export type PermissionLabels = Partial<Record<GroupPermissionKey, string>>;

const [FormProvider, useFormContext, useForm] = createFormContext<FormType>();

interface PermissionFormProps {
  initialPermissions: GroupPermissionKey[];
}

export const PermissionForm = ({ children, initialPermissions }: PropsWithChildren<PermissionFormProps>) => {
  // Mantine compares each field against the values snapshot, so toggling a control back to its
  // saved value clears the dirty state on its own - no manual bookkeeping needed here.
  const form = useForm({
    initialValues: groupPermissionKeys.reduce((acc, key) => {
      acc[key] = initialPermissions.includes(key);
      return acc;
    }, {} as FormType),
  });

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <FormProvider form={form}>{children}</FormProvider>
    </form>
  );
};

type FormType = Record<GroupPermissionKey, boolean>;

type MatrixForm = ReturnType<typeof useFormContext>;

const emptyMatrixState = (): PermissionMatrixState =>
  objectKeys(permissionMatrix).reduce((acc, category) => {
    acc[category] = { level: 0, capabilities: [] };
    return acc;
  }, {} as PermissionMatrixState);

const matrixStateOf = (values: FormType) => permissionsToMatrixState(groupPermissionKeys.filter((key) => values[key]));

export const getMatrixLevel = (values: FormType, category: PermissionMatrixCategory): number =>
  matrixStateOf(values)[category].level;

export const hasMatrixCapability = (
  values: FormType,
  category: PermissionMatrixCategory,
  capability: GroupPermissionKey,
): boolean => matrixStateOf(values)[category].capabilities.includes(capability);

export const applyMatrixLevel = (form: MatrixForm, category: PermissionMatrixCategory, level: number) => {
  const targetKeys = new Set(
    matrixStateToPermissions({ ...emptyMatrixState(), [category]: { level, capabilities: [] } }),
  );
  permissionMatrix[category].levels.forEach((key) => {
    form.setFieldValue(key, targetKeys.has(key));
  });
  // Capability keys are deliberately left untouched: a level that implies one already covers it,
  // and an explicitly granted capability must survive lowering the level again.
};

export const applyMatrixCapability = (form: MatrixForm, capability: GroupPermissionKey, granted: boolean) => {
  form.setFieldValue(capability, granted);
};

const presets = {
  viewer: {
    board: { level: 1, capabilities: [] },
    app: { level: 0, capabilities: ["app-use-all"] },
    integration: { level: 1, capabilities: [] },
    media: { level: 1, capabilities: [] },
  },
  editor: {
    board: { level: 2, capabilities: ["board-create"] },
    app: { level: 1, capabilities: ["app-use-all"] },
    integration: { level: 2, capabilities: ["integration-create"] },
    "search-engine": { level: 1, capabilities: [] },
    media: { level: 1, capabilities: ["media-upload"] },
  },
  admin: { admin: { level: 1, capabilities: [] } },
} satisfies Record<string, Partial<PermissionMatrixState>>;

export type PermissionPreset = keyof typeof presets;

const presetToFormState = (preset: PermissionPreset): FormType => {
  const presetState: Partial<PermissionMatrixState> = presets[preset];
  const state = objectKeys(permissionMatrix).reduce((acc, category) => {
    acc[category] = presetState[category] ?? { level: 0, capabilities: [] };
    return acc;
  }, {} as PermissionMatrixState);
  const enabledKeys = new Set(matrixStateToPermissions(state));

  return groupPermissionKeys.reduce((acc, key) => {
    acc[key] = enabledKeys.has(key);
    return acc;
  }, {} as FormType);
};

export const applyPreset = (form: MatrixForm, preset: PermissionPreset) => {
  form.setValues(presetToFormState(preset));
};

export const getActivePreset = (values: FormType): PermissionPreset | null => {
  return (
    objectKeys(presets).find((preset) => {
      const presetValues = presetToFormState(preset);
      return groupPermissionKeys.every((key) => presetValues[key] === values[key]);
    }) ?? null
  );
};

/**
 * Short, scannable label for a level. Categories with a single level use their permission label
 * instead, so the control reads "No access | View logs" rather than "No access | Enabled".
 */
const levelLabelKey = (key: GroupPermissionKey) => {
  if (key.endsWith("-view-all")) return "view" as const;
  if (key.endsWith("-use-all")) return "use" as const;
  if (key.endsWith("-interact-all")) return "interact" as const;
  if (key.endsWith("-modify-all")) return "modify" as const;
  if (key.endsWith("-full-all")) return "full" as const;
  return null;
};

interface MatrixImpliedHintProps {
  category: PermissionMatrixCategory;
  permissionLabels: PermissionLabels;
}

export const MatrixImpliedHint = ({ category, permissionLabels }: MatrixImpliedHintProps) => {
  const form = useFormContext();
  const tPermissions = useI18n("group.permission");

  const level = getMatrixLevel(form.getValues(), category);
  if (level === 0) {
    return null;
  }

  const checkedKeys: GroupPermissionKey[] = permissionMatrix[category].levels.slice(0, level);
  const implied = getPermissionsWithChildren(checkedKeys).filter((key) => !checkedKeys.includes(key));
  if (implied.length === 0) {
    return null;
  }

  const labels = implied.map((key) => permissionLabels[key] ?? key);

  return (
    <Text size="xs" c="dimmed">
      {tPermissions("matrix.impliedHint", { permissions: labels.join(", ") })}
    </Text>
  );
};

interface MatrixRowProps {
  category: PermissionMatrixCategory;
  permissionLabels: PermissionLabels;
  permissionDescriptions: PermissionLabels;
}

export const MatrixRow = ({ category, permissionLabels, permissionDescriptions }: MatrixRowProps) => {
  const form = useFormContext();
  const tPermissions = useI18n("group.permission");

  const values = form.getValues();
  const level = getMatrixLevel(values, category);
  const isDanger = category === "admin";
  const disabledByAdmin = !isDanger && getMatrixLevel(values, "admin") > 0;
  const { levels, capabilities } = permissionMatrix[category];
  const hasSingleLevel = levels.length === 1;

  const data = [
    { value: "0", label: tPermissions("matrix.none") },
    ...levels.map((key, index) => {
      const shortKey = hasSingleLevel ? null : levelLabelKey(key);
      return {
        value: String(index + 1),
        label: shortKey === null ? (permissionLabels[key] ?? key) : tPermissions(`matrix.level.${shortKey}`),
      };
    }),
  ];

  const capabilityStates = capabilities.map((capability) => ({
    capability,
    checked: hasMatrixCapability(values, category, capability),
    implied: isCapabilityImpliedByLevel(category, capability, level),
  }));

  const selectedKey = level === 0 ? undefined : levels[level - 1];
  // With no access level but a capability granted, describing the row as "no access" would
  // contradict the checkbox next to it, so the granted capability describes the row instead.
  const describedKey = selectedKey ?? capabilityStates.find(({ checked }) => checked)?.capability;
  const description =
    describedKey === undefined ? tPermissions("matrix.noneDescription") : (permissionDescriptions[describedKey] ?? "");

  return (
    <Stack gap={6}>
      <Group gap="sm" wrap="wrap" align="center" justify="space-between">
        <Group gap={6} wrap="nowrap">
          {isDanger && <IconShieldExclamation size={18} color="var(--mantine-color-red-8)" />}
          <Text fw={500} c={isDanger ? "red.8" : undefined}>
            {tPermissions(`${category}.title`)}
          </Text>
        </Group>
        <Group gap="md" wrap="wrap" align="center">
          <SegmentedControl
            size="sm"
            data={data}
            value={String(level)}
            disabled={disabledByAdmin}
            aria-label={tPermissions(`${category}.title`)}
            onChange={(value) => applyMatrixLevel(form, category, Number(value))}
          />
          {/* Fixed-width column so every level control lines up, whatever capabilities a row has. */}
          <Box w={{ base: "auto", sm: 230 }}>
            <Stack gap={4}>
              {capabilityStates.map(({ capability, checked, implied }) => (
                <Tooltip
                  key={capability}
                  label={tPermissions("matrix.capabilityIncluded", { level: data[level]?.label ?? "" })}
                  disabled={!implied}
                >
                  <Checkbox
                    size="sm"
                    label={permissionLabels[capability] ?? capability}
                    checked={checked}
                    disabled={disabledByAdmin || implied}
                    onChange={(event) => applyMatrixCapability(form, capability, event.currentTarget.checked)}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>
        </Group>
      </Group>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
      {disabledByAdmin && (
        <Text size="xs" c="dimmed">
          {tPermissions("matrix.grantedViaAdmin")}
        </Text>
      )}
      <MatrixImpliedHint category={category} permissionLabels={permissionLabels} />
    </Stack>
  );
};

interface PermissionMatrixProps {
  permissionLabels: PermissionLabels;
  permissionDescriptions: PermissionLabels;
}

export const PermissionMatrix = ({ permissionLabels, permissionDescriptions }: PermissionMatrixProps) => (
  <Card withBorder p="md">
    <Stack gap="md">
      {objectKeys(permissionMatrix).map((category, index) => (
        <Stack key={category} gap="md">
          {index > 0 && <Divider />}
          <MatrixRow
            category={category}
            permissionLabels={permissionLabels}
            permissionDescriptions={permissionDescriptions}
          />
        </Stack>
      ))}
    </Stack>
  </Card>
);

export const PresetButtons = () => {
  const form = useFormContext();
  const tPermissions = useI18n("group.permission");
  const activePreset = getActivePreset(form.getValues());

  return (
    <Group gap="xs" wrap="wrap">
      <Text size="sm" fw={500}>
        {tPermissions("matrix.preset.label")}
      </Text>
      {(["viewer", "editor", "admin"] as const).map((preset) => (
        <Tooltip key={preset} label={tPermissions(`matrix.preset.${preset}Description`)}>
          <Button
            size="xs"
            variant={activePreset === preset ? "filled" : "default"}
            onClick={() => applyPreset(form, preset)}
          >
            {tPermissions(`matrix.preset.${preset}`)}
          </Button>
        </Tooltip>
      ))}
      {activePreset === null && <Badge variant="light">{tPermissions("matrix.preset.custom")}</Badge>}
    </Group>
  );
};

interface EffectivePermissionPreviewProps {
  permissionLabels: PermissionLabels;
}

export const EffectivePermissionPreview = ({ permissionLabels }: EffectivePermissionPreviewProps) => {
  const form = useFormContext();
  const tPermissions = useI18n("group.permission");
  const [opened, { toggle }] = useDisclosure(false);
  const panelId = useId();

  const values = form.getValues();
  const checkedKeys = groupPermissionKeys.filter((key) => values[key]);
  const effective = getPermissionsWithChildren(checkedKeys);

  const grouped = objectKeys(permissionMatrix)
    .map((category) => ({
      category,
      keys: effective.filter((key) => key === category || key.startsWith(`${category}-`)),
    }))
    .filter(({ keys }) => keys.length > 0);

  return (
    <Card withBorder p="md">
      <UnstyledButton onClick={toggle} w="100%" aria-expanded={opened} aria-controls={panelId}>
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Text fw={500}>{tPermissions("matrix.effective.title")}</Text>
            <Text size="xs" c="dimmed">
              {tPermissions("matrix.effective.description")}
            </Text>
          </Stack>
          <Badge variant="light">{effective.length}</Badge>
        </Group>
      </UnstyledButton>
      <Collapse id={panelId} expanded={opened}>
        <Stack gap="xs" mt="sm">
          {grouped.length === 0 ? (
            <Text size="sm" c="dimmed">
              {tPermissions("matrix.effective.empty")}
            </Text>
          ) : (
            grouped.map(({ category, keys }) => (
              <Group key={category} gap="xs" wrap="wrap" align="flex-start">
                <Text size="sm" fw={500}>
                  {tPermissions(`${category}.title`)}
                </Text>
                <Badge size="sm" variant="light">
                  {keys.length}
                </Badge>
                <Text size="sm" c="dimmed">
                  {keys.map((key) => permissionLabels[key] ?? key).join(", ")}
                </Text>
              </Group>
            ))
          )}
        </Stack>
      </Collapse>
    </Card>
  );
};

interface SaveAffixProps {
  groupId: string;
}

export const SaveAffix = ({ groupId }: SaveAffixProps) => {
  const tCommon = useI18n("common");
  const tNotification = useI18n("group.action.changePermissions.notification");
  const form = useFormContext();
  const { mutate, isPending } = clientApi.group.savePermissions.useMutation();

  const handleSubmit = useCallback(() => {
    const values = form.getValues();
    mutate(
      {
        permissions: objectEntries(values)
          .filter(([_, value]) => value)
          .map(([key]) => key),
        groupId,
      },
      {
        onSuccess: () => {
          // setInitialValues moves the snapshot so Discard returns here, but only resetDirty clears
          // the dirty flags that keep the unsaved-changes bar on screen.
          form.setInitialValues(values);
          form.resetDirty(values);
          showSuccessNotification({
            title: tNotification("success.title"),
            message: tNotification("success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: tNotification("error.title"),
            message: tNotification("error.message"),
          });
        },
      },
    );
  }, [form, groupId, mutate, tNotification]);

  return (
    <div style={{ position: "sticky", bottom: 20 }}>
      <Transition transition="slide-up" mounted={form.isDirty()}>
        {(transitionStyles) => (
          <Card style={transitionStyles}>
            <Group justify="space-between">
              <Text fw={500}>{tCommon("unsavedChanges")}</Text>
              <Group>
                <Button disabled={isPending} onClick={form.reset}>
                  {tCommon("action.discard")}
                </Button>
                <Button loading={isPending} onClick={handleSubmit}>
                  {tCommon("action.saveChanges")}
                </Button>
              </Group>
            </Group>
          </Card>
        )}
      </Transition>
    </div>
  );
};
