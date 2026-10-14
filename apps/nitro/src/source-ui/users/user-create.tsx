import type { ReactNode } from "react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Popover,
  Select,
  Stack,
  Stepper,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { PasswordInputProps } from "@mantine/core";
import { IconPlus, IconUserCheck } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { GroupPermissionKey } from "@homarr/definitions";
import { passwordRequirements } from "@homarr/validation/user";

import { PasswordRequirement } from "../../../../../packages/ui/src/components/password-input/password-requirement";
import { PasswordRequirementsPopover } from "../../../../../packages/ui/src/components/password-input/password-requirements-popover";
import type { SelectedUserGroup, UserAvatarRenderer } from "./contracts";
import { renderUserAvatar } from "./user-list";

const permissionTextKeys = {
  "board-create": { label: "board.item.create.label", description: "board.item.create.description" },
  "board-view-all": { label: "board.item.view-all.label", description: "board.item.view-all.description" },
  "board-modify-all": { label: "board.item.modify-all.label", description: "board.item.modify-all.description" },
  "board-full-all": { label: "board.item.full-all.label", description: "board.item.full-all.description" },
  "app-create": { label: "app.item.create.label", description: "app.item.create.description" },
  "app-use-all": { label: "app.item.use-all.label", description: "app.item.use-all.description" },
  "app-modify-all": { label: "app.item.modify-all.label", description: "app.item.modify-all.description" },
  "app-full-all": { label: "app.item.full-all.label", description: "app.item.full-all.description" },
  "integration-create": { label: "integration.item.create.label", description: "integration.item.create.description" },
  "integration-use-all": {
    label: "integration.item.use-all.label",
    description: "integration.item.use-all.description",
  },
  "integration-interact-all": {
    label: "integration.item.interact-all.label",
    description: "integration.item.interact-all.description",
  },
  "integration-full-all": {
    label: "integration.item.full-all.label",
    description: "integration.item.full-all.description",
  },
  "search-engine-create": {
    label: "search-engine.item.create.label",
    description: "search-engine.item.create.description",
  },
  "search-engine-modify-all": {
    label: "search-engine.item.modify-all.label",
    description: "search-engine.item.modify-all.description",
  },
  "search-engine-full-all": {
    label: "search-engine.item.full-all.label",
    description: "search-engine.item.full-all.description",
  },
  "media-upload": { label: "media.item.upload.label", description: "media.item.upload.description" },
  "media-view-all": { label: "media.item.view-all.label", description: "media.item.view-all.description" },
  "media-full-all": { label: "media.item.full-all.label", description: "media.item.full-all.description" },
  "other-view-logs": { label: "other.item.view-logs.label", description: "other.item.view-logs.description" },
  admin: { label: "admin.item.admin.label", description: "admin.item.admin.description" },
} satisfies Record<
  GroupPermissionKey,
  {
    label: Parameters<ScopedTranslationFunction<"group.permission">>[0];
    description: Parameters<ScopedTranslationFunction<"group.permission">>[0];
  }
>;

export function PasswordSuggestionsView({ password }: { password: string }) {
  const t = useI18n("user.field.password");
  return (
    <Stack gap={2}>
      <Text size="sm" c="dimmed">
        {t("suggestionsTitle")}
      </Text>
      {passwordRequirements.map((requirement) => (
        <PasswordRequirement
          key={requirement.value}
          label={t(`suggestion.${requirement.value}`)}
          meets={requirement.check(password)}
        />
      ))}
    </Stack>
  );
}

export function UserPasswordInput(props: PasswordInputProps & { value: string }) {
  return (
    <PasswordRequirementsPopover password={props.value}>
      <PasswordInput {...props} visibilityToggleFocusable />
    </PasswordRequirementsPopover>
  );
}

export interface UserCreateViewProps {
  step: number;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  groups: SelectedUserGroup[];
  selectedGroupIds: string[];
  everyoneGroupName: string;
  disabled: boolean;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onGroupAdd: (id: string) => void;
  onGroupRemove: (id: string) => void;
  navigation: ReactNode;
  feedback?: ReactNode;
  renderAvatar?: UserAvatarRenderer;
  permissionLabel?: (permission: GroupPermissionKey) => string;
  permissionDescription?: (permission: GroupPermissionKey) => string;
  effectivePermissions?: readonly GroupPermissionKey[];
}

export function UserCreateView({
  step,
  username,
  email,
  password,
  confirmPassword,
  groups,
  selectedGroupIds,
  everyoneGroupName,
  disabled,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onGroupAdd,
  onGroupRemove,
  navigation,
  feedback,
  renderAvatar = renderUserAvatar,
  permissionLabel,
  permissionDescription,
  effectivePermissions,
}: UserCreateViewProps) {
  const [addingGroup, setAddingGroup] = useState(false);
  const tCreate = useI18n("management.page.user.create");
  const tUserField = useI18n("user.field");
  const tCommon = useI18n("common");
  const tGroup = useI18n("group.action.select");
  const tPermission = useI18n("permission");
  const tGroupPermission = useI18n("group.permission");
  const getPermissionLabel = (permission: GroupPermissionKey) =>
    permissionLabel?.(permission) ?? tGroupPermission(permissionTextKeys[permission].label);
  const getPermissionDescription = (permission: GroupPermissionKey) =>
    permissionDescription?.(permission) ?? tGroupPermission(permissionTextKeys[permission].description);
  return (
    <Stack>
      <Title mb="md">{tCreate("title")}</Title>
      <Stepper active={step} allowNextStepsSelect={false} mb="md">
        <Stepper.Step label={tCreate("step.personalInformation.label")} allowStepSelect={false} allowStepClick={false}>
          <Card p="xl">
            <Stack gap="md">
              <TextInput
                label={tUserField("username.label")}
                variant="filled"
                withAsterisk
                value={username}
                disabled={disabled}
                onChange={(event) => onUsernameChange(event.currentTarget.value)}
              />
              <TextInput
                label={tUserField("email.label")}
                variant="filled"
                value={email}
                disabled={disabled}
                onChange={(event) => onEmailChange(event.currentTarget.value)}
              />
            </Stack>
          </Card>
        </Stepper.Step>
        <Stepper.Step label={tCreate("step.security.label")} allowStepSelect={false} allowStepClick={false}>
          <Card p="xl">
            <Stack gap="md">
              <UserPasswordInput
                label={tUserField("password.label")}
                variant="filled"
                withAsterisk
                autoComplete="new-password"
                value={password}
                disabled={disabled}
                onChange={(event) => onPasswordChange(event.currentTarget.value)}
              />
              <PasswordInput
                label={tUserField("passwordConfirm.label")}
                variant="filled"
                withAsterisk
                autoComplete="new-password"
                value={confirmPassword}
                disabled={disabled}
                onChange={(event) => onConfirmPasswordChange(event.currentTarget.value)}
              />
            </Stack>
          </Card>
        </Stepper.Step>
        <Stepper.Step label={tCreate("step.groups.label")} allowStepSelect={false} allowStepClick={false}>
          <Card p="xl">
            <Stack>
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text fw={500}>{tCreate("step.groups.title")}</Text>
                  <Text size="sm" c="dimmed">
                    {tCreate("step.groups.description", { everyoneGroup: everyoneGroupName })}
                  </Text>
                </Stack>
                <Popover opened={addingGroup} onChange={setAddingGroup} position="bottom-end" withinPortal>
                  <Popover.Target>
                    <Button
                      variant="subtle"
                      color="gray"
                      leftSection={<IconPlus size={16} stroke={1.5} />}
                      disabled={disabled}
                      onClick={() => setAddingGroup(!addingGroup)}
                    >
                      {tCommon("action.add")}
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Select
                      label={tGroup("label")}
                      nothingFoundMessage={tGroup("notFound")}
                      searchable
                      disabled={disabled}
                      value={null}
                      data={groups
                        .filter((group) => !selectedGroupIds.includes(group.id))
                        .map((group) => ({ value: group.id, label: group.name }))}
                      onChange={(id) => {
                        if (!id) return;
                        onGroupAdd(id);
                        setAddingGroup(false);
                      }}
                    />
                  </Popover.Dropdown>
                </Popover>
              </Group>
              <Table.ScrollContainer minWidth={420}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{tCommon("field.name")}</Table.Th>
                      <Table.Th>{tPermission("title")}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {groups
                      .filter((group) => selectedGroupIds.includes(group.id))
                      .map((group) => (
                        <Table.Tr key={group.id}>
                          <Table.Td>{group.name}</Table.Td>
                          <Table.Td w="100%">
                            <Group gap="xs">
                              {group.permissions.map((permission) => (
                                <Tooltip key={permission} label={getPermissionDescription(permission)}>
                                  <Badge color={permission === "admin" ? "red" : "blue"} size="sm" variant="dot">
                                    {getPermissionLabel(permission)}
                                  </Badge>
                                </Tooltip>
                              ))}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {group.name !== everyoneGroupName && (
                              <Button variant="subtle" disabled={disabled} onClick={() => onGroupRemove(group.id)}>
                                {tCommon("action.remove")}
                              </Button>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              {effectivePermissions && (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    {tGroupPermission("matrix.effective.title")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {tGroupPermission("matrix.effective.description")}
                  </Text>
                  {effectivePermissions.length === 0 && (
                    <Text size="sm">{tGroupPermission("matrix.effective.empty")}</Text>
                  )}
                  <Group gap="xs">
                    {effectivePermissions.map((permission) => (
                      <Tooltip key={permission} label={getPermissionDescription(permission)}>
                        <Badge variant="dot" size="sm" color={permission === "admin" ? "red" : "blue"}>
                          {getPermissionLabel(permission)}
                        </Badge>
                      </Tooltip>
                    ))}
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Stepper.Step>
        <Stepper.Step label={tCreate("step.review.label")} allowStepSelect={false} allowStepClick={false}>
          <Card p="xl">
            <Stack maw={300} align="center" mx="auto">
              {renderAvatar({ id: "", name: username, email, image: null }, "xl")}
              <Text fw={700} size="xl">
                {username}
              </Text>
              {email && <Text c="dimmed">{email}</Text>}
              <Group justify="center" gap="xs">
                {groups
                  .filter((group) => selectedGroupIds.includes(group.id))
                  .map((group) => (
                    <Badge key={group.id} variant="light">
                      {group.name}
                    </Badge>
                  ))}
              </Group>
            </Stack>
          </Card>
        </Stepper.Step>
        <Stepper.Completed>
          <Card p="xl">
            <Stack align="center" maw={300} mx="auto">
              <IconUserCheck size="3rem" />
              <Title order={2}>{tCreate("step.completed.title")}</Title>
            </Stack>
          </Card>
        </Stepper.Completed>
      </Stepper>
      {feedback}
      {navigation}
    </Stack>
  );
}
