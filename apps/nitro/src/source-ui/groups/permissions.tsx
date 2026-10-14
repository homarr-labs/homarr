import { useId } from "react";
import type { ReactNode } from "react";
import {
  Alert,
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
  Title,
  Tooltip,
  Transition,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconShieldExclamation } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

import { objectKeys } from "../../../../../packages/common/src/object";
import {
  getPermissionsWithChildren,
  isCapabilityImpliedByLevel,
  permissionMatrix,
  permissionsToMatrixState,
} from "../../../../../packages/definitions/src/permissions";
import type { GroupPermissionKey, PermissionMatrixCategory } from "../../../../../packages/definitions/src/permissions";

export type PermissionLabels = Partial<Record<GroupPermissionKey, string>>;
export type PermissionPreset = "viewer" | "editor" | "admin";

export interface PermissionMatrixViewProps {
  selected: GroupPermissionKey[];
  permissionLabels: PermissionLabels;
  permissionDescriptions: PermissionLabels;
  disabled: boolean;
  onLevelChange: (category: PermissionMatrixCategory, level: number) => void;
  onCapabilityChange: (capability: GroupPermissionKey, granted: boolean) => void;
}

export interface GroupPermissionPageViewProps extends PermissionMatrixViewProps {
  activePreset: PermissionPreset | null;
  onPreset: (preset: PermissionPreset) => void;
  dirty: boolean;
  isPending: boolean;
  onDiscard: () => void;
  onSave: () => void;
  feedback?: ReactNode;
  changedNotice?: ReactNode;
  holdReason: string | null;
}

export function GroupPermissionPageView({
  activePreset,
  onPreset,
  dirty,
  isPending,
  onDiscard,
  onSave,
  feedback,
  changedNotice,
  holdReason,
  ...matrix
}: GroupPermissionPageViewProps) {
  const tPage = useI18n("management.page.group.setting.permissions");
  return (
    <Stack>
      <Title>{tPage("title")}</Title>
      {holdReason && <Alert title="Permission writes unavailable">{holdReason}</Alert>}
      {changedNotice}
      <form onSubmit={(event) => event.preventDefault()}>
        <Stack pos="relative">
          <PresetButtons activePreset={activePreset} disabled={matrix.disabled} onPreset={onPreset} />
          <PermissionMatrix {...matrix} />
          <EffectivePermissionPreview selected={matrix.selected} permissionLabels={matrix.permissionLabels} />
          {feedback}
          <SaveAffix
            visible={dirty}
            isPending={isPending}
            saveUnavailable={Boolean(holdReason) || matrix.disabled}
            onDiscard={onDiscard}
            onSave={onSave}
          />
        </Stack>
      </form>
    </Stack>
  );
}

function levelLabelKey(key: GroupPermissionKey): "view" | "use" | "interact" | "modify" | "full" | null {
  if (key.endsWith("-view-all")) return "view";
  if (key.endsWith("-use-all")) return "use";
  if (key.endsWith("-interact-all")) return "interact";
  if (key.endsWith("-modify-all")) return "modify";
  if (key.endsWith("-full-all")) return "full";
  return null;
}

export function MatrixImpliedHint({
  category,
  selected,
  permissionLabels,
}: Pick<PermissionMatrixViewProps, "selected" | "permissionLabels"> & { category: PermissionMatrixCategory }) {
  const tPermissions = useI18n("group.permission");
  const level = permissionsToMatrixState(selected)[category].level;
  if (level === 0) return null;
  const checkedKeys: GroupPermissionKey[] = permissionMatrix[category].levels.slice(0, level);
  const implied = getPermissionsWithChildren(checkedKeys).filter((key) => !checkedKeys.includes(key));
  if (implied.length === 0) return null;
  return (
    <Text size="xs" c="dimmed">
      {tPermissions("matrix.impliedHint", {
        permissions: implied.map((key) => permissionLabels[key] ?? key).join(", "),
      })}
    </Text>
  );
}

export function MatrixRow({
  category,
  selected,
  permissionLabels,
  permissionDescriptions,
  disabled,
  onLevelChange,
  onCapabilityChange,
}: PermissionMatrixViewProps & { category: PermissionMatrixCategory }) {
  const tPermissions = useI18n("group.permission");
  const state = permissionsToMatrixState(selected);
  const level = state[category].level;
  const isDanger = category === "admin";
  const disabledByAdmin = !isDanger && state.admin.level > 0;
  const { levels, capabilities } = permissionMatrix[category];
  const data = [
    { value: "0", label: tPermissions("matrix.none") },
    ...levels.map((key, index) => {
      const shortKey = levels.length === 1 ? null : levelLabelKey(key);
      return {
        value: String(index + 1),
        label: shortKey === null ? (permissionLabels[key] ?? key) : tPermissions(`matrix.level.${shortKey}`),
      };
    }),
  ];
  const capabilityStates = capabilities.map((capability) => ({
    capability,
    checked: state[category].capabilities.includes(capability),
    implied: isCapabilityImpliedByLevel(category, capability, level),
  }));
  const selectedKey = level === 0 ? undefined : levels[level - 1];
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
            disabled={disabled || disabledByAdmin}
            aria-label={tPermissions(`${category}.title`)}
            onChange={(value) => onLevelChange(category, Number(value))}
          />
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
                    disabled={disabled || disabledByAdmin || implied}
                    onChange={(event) => onCapabilityChange(capability, event.currentTarget.checked)}
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
      <MatrixImpliedHint category={category} selected={selected} permissionLabels={permissionLabels} />
    </Stack>
  );
}

export function PermissionMatrix(props: PermissionMatrixViewProps) {
  return (
    <Card withBorder p="md">
      <Stack gap="md">
        {objectKeys(permissionMatrix).map((category, index) => (
          <Stack key={category} gap="md">
            {index > 0 && <Divider />}
            <MatrixRow {...props} category={category} />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

export function PresetButtons({
  activePreset,
  disabled,
  onPreset,
}: {
  activePreset: PermissionPreset | null;
  disabled: boolean;
  onPreset: (preset: PermissionPreset) => void;
}) {
  const tPermissions = useI18n("group.permission");
  const presets: PermissionPreset[] = ["viewer", "editor", "admin"];
  return (
    <Group gap="xs" wrap="wrap">
      <Text size="sm" fw={500}>
        {tPermissions("matrix.preset.label")}
      </Text>
      {presets.map((preset) => (
        <Tooltip key={preset} label={tPermissions(`matrix.preset.${preset}Description`)}>
          <Button
            size="xs"
            disabled={disabled}
            variant={activePreset === preset ? "filled" : "default"}
            onClick={() => onPreset(preset)}
          >
            {tPermissions(`matrix.preset.${preset}`)}
          </Button>
        </Tooltip>
      ))}
      {activePreset === null && <Badge variant="light">{tPermissions("matrix.preset.custom")}</Badge>}
    </Group>
  );
}

export function EffectivePermissionPreview({
  selected,
  permissionLabels,
}: Pick<PermissionMatrixViewProps, "selected" | "permissionLabels">) {
  const tPermissions = useI18n("group.permission");
  const [opened, { toggle }] = useDisclosure(false);
  const panelId = useId();
  const effective = getPermissionsWithChildren(selected);
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
}

export function SaveAffix({
  visible,
  isPending,
  saveUnavailable,
  onDiscard,
  onSave,
}: {
  visible: boolean;
  isPending: boolean;
  saveUnavailable: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const tCommon = useI18n("common");
  return (
    <div style={{ position: "sticky", bottom: 20 }}>
      <Transition transition="slide-up" mounted={visible}>
        {(transitionStyles) => (
          <Card style={transitionStyles}>
            <Group justify="space-between">
              <Text fw={500}>{tCommon("unsavedChanges")}</Text>
              <Group>
                <Button disabled={isPending} onClick={onDiscard}>
                  {tCommon("action.discard")}
                </Button>
                <Button loading={isPending} disabled={saveUnavailable} onClick={onSave}>
                  {tCommon("action.saveChanges")}
                </Button>
              </Group>
            </Group>
          </Card>
        )}
      </Transition>
    </div>
  );
}
