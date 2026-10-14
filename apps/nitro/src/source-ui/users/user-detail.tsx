import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  FileButton,
  Grid,
  Group,
  Menu,
  NavLink,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconExclamationCircle,
  IconPencil,
  IconPhotoEdit,
  IconPhotoX,
  IconSettings,
  IconShieldLock,
} from "@tabler/icons-react";

import { InlineConfirmMenuItem } from "../../../../../packages/ui/src/components/inline-confirm-action";
import { extractErrorMessage } from "@homarr/common/error";
import { useI18n } from "@homarr/translation/client";
import type { UserAvatarRenderer, UserSummary } from "./contracts";
import { renderUserAvatar } from "./user-list";

export interface UserDetailViewProps {
  user: UserSummary;
  credentials: boolean;
  section: "general" | "security";
  onSectionChange: (section: "general" | "security") => void;
  children: ReactNode;
  renderAvatar?: UserAvatarRenderer;
}

export function UserDetailView({
  user,
  credentials,
  section,
  onSectionChange,
  children,
  renderAvatar = renderUserAvatar,
}: UserDetailViewProps) {
  const tUser = useI18n("user");
  const tManagement = useI18n("management.page.user");
  return (
    <Grid>
      <Grid.Col span={12}>
        <Group align="center">
          {renderAvatar(user, "lg")}
          <Stack gap={0}>
            <Title order={3}>{user.name}</Title>
            <Text c="gray.5">{tUser("name")}</Text>
          </Stack>
        </Group>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4, lg: 3, xl: 2 }}>
        <Stack gap={0} component="nav" aria-label={tUser("name")}>
          <NavLink
            component="button"
            label={tManagement("setting.general.title")}
            active={section === "general"}
            leftSection={<IconSettings size="1rem" stroke={1.5} />}
            onClick={() => onSectionChange("general")}
          />
          {credentials && (
            <NavLink
              component="button"
              label={tManagement("setting.security.title")}
              active={section === "security"}
              leftSection={<IconShieldLock size="1rem" stroke={1.5} />}
              onClick={() => onSectionChange("security")}
            />
          )}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8, lg: 9, xl: 10 }}>{children}</Grid.Col>
    </Grid>
  );
}

export function UserGeneralView({
  profile,
  avatar,
  preferences,
  danger,
  externalProvider,
}: {
  profile: ReactNode;
  avatar: ReactNode;
  preferences?: ReactNode;
  danger: ReactNode;
  externalProvider?: string;
}) {
  const tManagement = useI18n("management.page.user");
  return (
    <Stack gap="lg">
      {externalProvider && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {tManagement("fieldsDisabledExternalProvider")}
        </Alert>
      )}
      <Title>{tManagement("setting.general.title")}</Title>
      <Group gap="xl" align="flex-start" wrap="wrap">
        <Box flex={1} miw={{ base: "100%", md: 540 }}>
          {profile}
        </Box>
        <Box w={{ base: "100%", lg: 260 }}>{avatar}</Box>
      </Group>
      {preferences}
      {danger}
    </Stack>
  );
}

export function UserProfileFieldsView({ children }: { children: ReactNode }) {
  const tUser = useI18n("user");
  return (
    <Card withBorder bg="transparent">
      <Stack gap="md">
        <Title order={3}>{tUser("name")}</Title>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
}

export function UserProfileSaveView({
  dirty,
  pending,
  disabled,
  onDiscard,
}: {
  dirty: boolean;
  pending: boolean;
  disabled: boolean;
  onDiscard: () => void;
}) {
  const tCommon = useI18n("common");
  if (!dirty) return null;
  return (
    <div style={{ position: "sticky", bottom: 20 }}>
      <Card withBorder>
        <Group justify="space-between" wrap="wrap">
          <Text fw={500}>{tCommon("unsavedChanges")}</Text>
          <Group>
            <Button disabled={pending} variant="default" onClick={onDiscard}>
              {tCommon("action.discard")}
            </Button>
            <Button loading={pending} type="submit" disabled={disabled}>
              {tCommon("action.saveChanges")}
            </Button>
          </Group>
        </Group>
      </Card>
    </div>
  );
}

export interface UserAvatarMenuViewProps {
  user: UserSummary;
  disabled: boolean;
  pending: boolean;
  onImageChange: (file: File | null) => void;
  onRemove: () => Promise<void>;
  renderAvatar?: UserAvatarRenderer;
}

export function UserAvatarMenuView({
  user,
  disabled,
  pending,
  onImageChange,
  onRemove,
  renderAvatar = renderUserAvatar,
}: UserAvatarMenuViewProps) {
  const tCommon = useI18n("common");
  const tAvatar = useI18n("user.action.manageAvatar");
  const [opened, { close, open }] = useDisclosure(false);
  const mobile = useMediaQuery("(max-width: 48em)");
  let size = 200;
  if (mobile) size = 120;
  return (
    <Box pos="relative" display="flex" style={{ justifyContent: mobile ? "center" : undefined }}>
      <Menu
        opened={opened}
        onChange={(value) => {
          if (value) open();
          else close();
        }}
        keepMounted
        position="bottom-start"
        withArrow
        withinPortal
      >
        <Menu.Target>
          <UnstyledButton disabled={disabled || pending} aria-label={tAvatar("changeImage.label")}>
            {renderAvatar(user, size)}
            <Button
              component="div"
              pos="absolute"
              bottom={0}
              left={0}
              size="compact-md"
              fw="normal"
              variant="default"
              leftSection={<IconPencil size={18} stroke={1.5} />}
            >
              {tCommon("action.edit")}
            </Button>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <FileButton
            onChange={onImageChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={disabled || pending}
          >
            {(props) => (
              <Menu.Item
                {...props}
                disabled={disabled || pending}
                leftSection={<IconPhotoEdit size={16} stroke={1.5} />}
              >
                {tAvatar("changeImage.label")}
              </Menu.Item>
            )}
          </FileButton>
          {user.image && (
            <InlineConfirmMenuItem
              color="red"
              onConfirm={onRemove}
              confirmLabel={tCommon("action.confirm")}
              disabled={disabled || pending}
              leftSection={<IconPhotoX size={16} stroke={1.5} />}
            >
              {tAvatar("removeImage.label")}
            </InlineConfirmMenuItem>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}

export function UserDangerZoneView({ action }: { action: ReactNode }) {
  const tCommon = useI18n("common");
  const tUser = useI18n("user");
  return (
    <Stack>
      <Title order={2} c="red">
        {tCommon("dangerZone")}
      </Title>
      <Card withBorder bg="transparent">
        <Group justify="space-between" align="center" wrap="wrap">
          <Stack gap={0}>
            <Text fw={500}>{tUser("action.delete.label")}</Text>
            <Text c="dimmed" size="sm">
              {tUser("action.delete.description")}
            </Text>
          </Stack>
          {action}
        </Group>
      </Card>
    </Stack>
  );
}

export function UserUnavailableView({ reason }: { reason?: ReactNode }) {
  const t = useI18n("customWidget.secretEntry");
  return (
    <Alert component="output" aria-live="polite" title={t("unavailable")}>
      {reason}
    </Alert>
  );
}

export function UserRequestErrorView({ error, retry }: { error: unknown; retry?: () => void }) {
  const tCommon = useI18n("common");
  return (
    <Alert color="red" title={tCommon("error")} role="alert">
      <Stack gap="xs">
        <Text style={{ overflowWrap: "anywhere" }}>
          {error instanceof Error || typeof error === "string"
            ? extractErrorMessage(error)
            : tCommon("zod.errors.default")}
        </Text>
        {retry && (
          <Button variant="default" onClick={retry}>
            {tCommon("action.tryAgain")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function UserActionFeedbackView({
  action,
}: {
  action: { error: unknown; saved: boolean; refreshError: unknown };
}) {
  const tCommon = useI18n("common");
  if (action.error) return <UserRequestErrorView error={action.error} />;
  if (!action.saved && !action.refreshError) return null;
  return (
    <Stack gap="xs">
      {action.saved && (
        <Text component="output" aria-live="polite">
          {tCommon("notification.update.success")}
        </Text>
      )}
      {Boolean(action.refreshError) && <UserRequestErrorView error={action.refreshError} />}
    </Stack>
  );
}

export function UserLoadingView() {
  const tCommon = useI18n("common");
  return (
    <Stack component="output" aria-live="polite" aria-label={tCommon("action.loading")}>
      <Skeleton h={40} />
      <Skeleton h={100} />
    </Stack>
  );
}
