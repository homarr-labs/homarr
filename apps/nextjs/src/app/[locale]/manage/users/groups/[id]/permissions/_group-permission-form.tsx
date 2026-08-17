"use client";

import type { PropsWithChildren } from "react";
import { useCallback } from "react";
import {
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  SegmentedControl,
  Stack,
  Text,
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
  matrixStateToPermissions,
  permissionMatrix,
  permissionsToMatrixState,
} from "@homarr/definitions";
import { createFormContext } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

export type PermissionLabels = Partial<Record<GroupPermissionKey, string>>;

const [FormProvider, useFormContext, useForm] = createFormContext<FormType>();

interface PermissionFormProps {
  initialPermissions: GroupPermissionKey[];
}

export const PermissionForm = ({ children, initialPermissions }: PropsWithChildren<PermissionFormProps>) => {
  const form = useForm({
    initialValues: groupPermissionKeys.reduce((acc, key) => {
      acc[key] = initialPermissions.includes(key);
      return acc;
    }, {} as FormType),
    onValuesChange(values) {
      const currentKeys = objectEntries(values)
        .filter(([_key, value]) => Boolean(value))
        .map(([key]) => key);

      if (
        currentKeys.every((key) => initialPermissions.includes(key)) &&
        initialPermissions.every((key) => currentKeys.includes(key))
      ) {
        form.resetDirty(); // Reset dirty state if all keys are the same as initial
      }
    },
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
    acc[category] = { level: 0 };
    return acc;
  }, {} as PermissionMatrixState);

export const getMatrixLevel = (values: FormType, category: PermissionMatrixCategory): number => {
  const checkedKeys = groupPermissionKeys.filter((key) => values[key]);
  return permissionsToMatrixState(checkedKeys)[category].level;
};

export const applyMatrixLevel = (form: MatrixForm, category: PermissionMatrixCategory, level: number) => {
  const targetKeys = new Set(matrixStateToPermissions({ ...emptyMatrixState(), [category]: { level } }));
  permissionMatrix[category].levels.forEach((key) => {
    form.setFieldValue(key, targetKeys.has(key));
  });
};

const presets = {
  viewer: { board: 1, app: 1, integration: 1, media: 1 },
  editor: { board: 2, app: 2, integration: 2, "search-engine": 1, media: 1 },
  admin: { admin: 1 },
} satisfies Record<string, Partial<Record<PermissionMatrixCategory, number>>>;

export type PermissionPreset = keyof typeof presets;

const presetToFormState = (preset: PermissionPreset): FormType => {
  const levels: Partial<Record<PermissionMatrixCategory, number>> = presets[preset];
  const state = objectKeys(permissionMatrix).reduce((acc, category) => {
    acc[category] = { level: levels[category] ?? 0 };
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

interface MatrixImpliedHintProps {
  category: PermissionMatrixCategory;
  permissionLabels: PermissionLabels;
}

export const MatrixImpliedHint = ({ category, permissionLabels }: MatrixImpliedHintProps) => {
  const form = useFormContext();
  const tPermissions = useScopedI18n("group.permission");

  if (category === "admin") {
    return null;
  }

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
}

export const MatrixRow = ({ category, permissionLabels }: MatrixRowProps) => {
  const form = useFormContext();
  const tPermissions = useScopedI18n("group.permission");

  const values = form.getValues();
  const level = getMatrixLevel(values, category);
  const isDanger = category === "admin";
  const disabledByAdmin = !isDanger && getMatrixLevel(values, "admin") > 0;

  const data = [
    { value: "0", label: tPermissions("matrix.none") },
    ...permissionMatrix[category].levels.map((key, index) => ({
      value: String(index + 1),
      label: permissionLabels[key] ?? key,
    })),
  ];

  return (
    <Stack gap={4}>
      <Group gap="sm" wrap="wrap" align="center">
        <Group gap={6} wrap="nowrap">
          {isDanger && <IconShieldExclamation size={18} color="var(--mantine-color-red-8)" />}
          <Text fw={500} c={isDanger ? "red.8" : undefined}>
            {tPermissions(`${category}.title`)}
          </Text>
        </Group>
        <SegmentedControl
          size="sm"
          data={data}
          value={String(level)}
          disabled={disabledByAdmin}
          onChange={(value) => applyMatrixLevel(form, category, Number(value))}
        />
        {disabledByAdmin && (
          <Text size="xs" c="dimmed">
            {tPermissions("matrix.grantedViaAdmin")}
          </Text>
        )}
      </Group>
      <MatrixImpliedHint category={category} permissionLabels={permissionLabels} />
    </Stack>
  );
};

export const PresetButtons = () => {
  const form = useFormContext();
  const tPermissions = useScopedI18n("group.permission");
  const activePreset = getActivePreset(form.getValues());

  return (
    <Group gap="xs">
      <Text size="sm" fw={500}>
        {tPermissions("matrix.preset.label")}
      </Text>
      {(["viewer", "editor", "admin"] as const).map((preset) => (
        <Button
          key={preset}
          size="xs"
          variant={activePreset === preset ? "filled" : "default"}
          onClick={() => applyPreset(form, preset)}
        >
          {tPermissions(`matrix.preset.${preset}`)}
        </Button>
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
  const tPermissions = useScopedI18n("group.permission");
  const [opened, { toggle }] = useDisclosure(false);

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
      <UnstyledButton onClick={toggle} w="100%" aria-expanded={opened}>
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
      <Collapse expanded={opened}>
        <Stack gap="xs" mt="sm">
          {grouped.length === 0 ? (
            <Text size="sm" c="dimmed">
              {tPermissions("matrix.effective.empty")}
            </Text>
          ) : (
            grouped.map(({ category, keys }) => (
              <Group key={category} gap="xs" wrap="nowrap" align="flex-start">
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
  const t = useI18n();
  const tForm = useScopedI18n("management.page.group.setting.permissions.form");
  const tNotification = useScopedI18n("group.action.changePermissions.notification");
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
          // Set new initial values for discard and reset dirty state
          form.setInitialValues(values);
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
              <Text fw={500}>{tForm("unsavedChanges")}</Text>
              <Group>
                <Button disabled={isPending} onClick={form.reset}>
                  {t("common.action.discard")}
                </Button>
                <Button loading={isPending} onClick={handleSubmit}>
                  {t("common.action.saveChanges")}
                </Button>
              </Group>
            </Group>
          </Card>
        )}
      </Transition>
    </div>
  );
};
