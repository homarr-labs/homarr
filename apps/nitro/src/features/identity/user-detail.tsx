import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, Button, Code, Fieldset, Group, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form/i18n";
import { InlineConfirmButton } from "../../../../../packages/ui/src/components/inline-confirm-action";

import type { UserDetail } from "./client";
import { useIdentity, useIdentityKey } from "./boundary";
import { useIdentityAction } from "./feedback";
import { avatarSchema, userChangePasswordApiSchema, userEditProfileSchema, validationMessage } from "./validation";
import { useIdentityDraft } from "./draft";
import { UserPasswordInput } from "../../source-ui/users/user-create";
import {
  UserAvatarMenuView,
  UserDangerZoneView,
  UserDetailView,
  UserGeneralView,
  UserProfileFieldsView,
  UserProfileSaveView,
  UserActionFeedbackView as ActionFeedback,
  UserUnavailableView as IdentityDenied,
  UserRequestErrorView as IdentityError,
  UserLoadingView as IdentityLoading,
  UserUnavailableView,
} from "../../source-ui/users/user-detail";
import type { UserAvatarRenderer } from "../../source-ui/users/contracts";
import { getUserFieldLabel } from "../../source-ui/users/contracts";

export interface UserEditorProps {
  userId: string;
  onDeleted: () => void;
  initialSection?: "general" | "security";
  section?: "general" | "security";
  onSectionChange?: (section: "general" | "security") => void;
  preferences?: ReactNode;
  mutationUnavailableReason?: string;
  renderAvatar?: UserAvatarRenderer;
}

export function UserEditor({
  userId,
  onDeleted,
  initialSection = "general",
  section: controlledSection,
  onSectionChange,
  preferences,
  mutationUnavailableReason,
  renderAvatar,
}: UserEditorProps) {
  const tManagement = useI18n("management.page.user");
  const tCommon = useI18n("common");
  const { client, principal } = useIdentity();
  const [section, setSection] = useState(initialSection);
  const key = useIdentityKey();
  const permitted = principal.user.id === userId || principal.user.permissions.includes("admin");
  const query = useQuery({
    queryKey: [...key, "user", userId],
    queryFn: ({ signal }) => client.user.getById({ userId }, { signal }),
    enabled: permitted,
  });
  if (!permitted) return <IdentityDenied />;
  if (!query.data)
    return query.isError ? (
      <IdentityError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <IdentityLoading />
    );
  const user = query.data;
  const credentials = user.provider === "credentials";
  let activeSection = controlledSection ?? section;
  if (!credentials) activeSection = "general";
  return (
    <UserDetailView
      key={user.id}
      user={user}
      credentials={credentials}
      section={activeSection}
      renderAvatar={renderAvatar}
      onSectionChange={(next) => {
        setSection(next);
        onSectionChange?.(next);
      }}
    >
      <Stack gap="lg">
        {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
        {mutationUnavailableReason && <UserUnavailableView reason={mutationUnavailableReason} />}
        {activeSection === "general" && (
          <UserGeneralView
            externalProvider={!credentials ? user.provider : undefined}
            profile={<UserProfile key={user.id} user={user} mutationUnavailableReason={mutationUnavailableReason} />}
            avatar={
              <UserAvatarEditor
                user={user}
                mutationUnavailableReason={mutationUnavailableReason}
                renderAvatar={renderAvatar}
              />
            }
            preferences={preferences ?? <UserUnavailableView reason={tCommon("userAvatar.menu.preferences")} />}
            danger={
              <UserDelete user={user} onDeleted={onDeleted} mutationUnavailableReason={mutationUnavailableReason} />
            }
          />
        )}
        {activeSection === "security" && (
          <Stack>
            <Title>{tManagement("setting.security.title")}</Title>
            <UserPassword user={user} mutationUnavailableReason={mutationUnavailableReason} />
            <IdentityRecordAvailability />
          </Stack>
        )}
      </Stack>
    </UserDetailView>
  );
}

export function UserProfile({
  user,
  mutationUnavailableReason,
}: {
  user: UserDetail;
  mutationUnavailableReason?: string;
}) {
  const t = useI18n();
  const tUser = useI18n("user");
  const tCommon = useI18n("common");
  const { client, demo, principal } = useIdentity();
  const draft = useIdentityDraft({ name: user.name ?? "", email: user.email ?? "" });
  const { name, email } = draft.value;
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const external = user.provider !== "credentials";
  const disabled = Boolean(mutationUnavailableReason) || external || action.pending || (demo.enabled && demo.readOnly);
  const dirty = draft.dirty;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || !dirty) return;
        const result = userEditProfileSchema.safeParse({ id: user.id, name, email }, { error: zodErrorMap(t) });
        if (!result.success) {
          setValidation(
            validationMessage(
              result.error.issues.map((issue) => ({
                path: [getUserFieldLabel(issue.path[0], t)],
                message: issue.message,
              })),
            ),
          );
          return;
        }
        setValidation(null);
        await action.run((signal) => client.user.editProfile(result.data, { signal }), {
          refreshAuthority: principal.user.id === user.id,
          onSuccess: () => draft.acknowledge({ name, email }),
        });
      }}
    >
      <Stack>
        <UserProfileFieldsView>
          <Stack>
            <TextInput
              label={tUser("field.username.label")}
              required
              value={name}
              disabled={disabled || demo.enabled}
              onChange={(event) => draft.setValue({ ...draft.value, name: event.currentTarget.value })}
            />
            <TextInput
              label={tUser("field.email.label")}
              disabled={disabled}
              value={email}
              onChange={(event) => draft.setValue({ ...draft.value, email: event.currentTarget.value })}
            />
          </Stack>
        </UserProfileFieldsView>
        {validation && <IdentityError error={validation} />}
        <ActionFeedback action={action} />
        {draft.changed && (
          <Alert title={tCommon("unsavedChanges")}>
            <Stack gap="xs">
              <Text fw={500}>{tCommon("action.refresh")}</Text>
              <Text>
                {tUser("field.username.label")}: {user.name ?? "-"}
              </Text>
              <Text>
                {tUser("field.email.label")}: {user.email ?? "-"}
              </Text>
            </Stack>
          </Alert>
        )}
        {!external && (
          <UserProfileSaveView
            dirty={dirty}
            pending={action.pending}
            disabled={disabled}
            onDiscard={() => {
              draft.discard();
              setValidation(null);
              action.clear();
            }}
          />
        )}
      </Stack>
    </form>
  );
}

export function UserAvatarEditor({
  user,
  mutationUnavailableReason,
  renderAvatar,
}: {
  user: UserDetail;
  mutationUnavailableReason?: string;
  renderAvatar?: UserAvatarRenderer;
}) {
  const t = useI18n();
  const tCommon = useI18n("common");
  const tAvatar = useI18n("user.action.manageAvatar");
  const { client, demo, principal } = useIdentity();
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const disabled = Boolean(mutationUnavailableReason) || (demo.enabled && demo.readOnly);
  return (
    <Stack>
      <UserAvatarMenuView
        user={user}
        renderAvatar={renderAvatar}
        disabled={disabled}
        pending={action.pending}
        onImageChange={async (file) => {
          if (!file || disabled || action.pending) return;
          if (file.size > 262144) {
            setValidation(tAvatar("changeImage.notification.toLarge.message", { size: "256 KiB" }));
            return;
          }
          if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
            setValidation(tCommon("zod.errors.custom.invalidFileType", { expected: "PNG, JPEG, GIF, WebP" }));
            return;
          }
          setValidation(null);
          await action.run(
            async (signal) => {
              const image = await readAvatar(file, signal, tAvatar("changeImage.notification.error.message"));
              const parsed = avatarSchema.parse(image, { error: zodErrorMap(t) });
              await client.user.setProfileImage({ userId: user.id, image: parsed }, { signal });
            },
            { refreshAuthority: principal.user.id === user.id },
          );
        }}
        onRemove={async () => {
          if (disabled || action.pending) return;
          await action.run((signal) => client.user.setProfileImage({ userId: user.id, image: null }, { signal }), {
            refreshAuthority: principal.user.id === user.id,
          });
        }}
      />
      {validation && <IdentityError error={validation} />}
      <ActionFeedback action={action} />
    </Stack>
  );
}

function readAvatar(file: File, signal: AbortSignal, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const reader = new FileReader();
    const abort = () => reader.abort();
    signal.addEventListener("abort", abort, { once: true });
    reader.addEventListener("loadend", () => signal.removeEventListener("abort", abort), { once: true });
    reader.addEventListener(
      "load",
      () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(errorMessage))),
      { once: true },
    );
    reader.addEventListener("error", () => reject(new Error(errorMessage)), { once: true });
    reader.addEventListener("abort", () => reject(new Error(errorMessage)), { once: true });
    reader.readAsDataURL(file);
  });
}

export function UserPassword({
  user,
  mutationUnavailableReason,
}: {
  user: UserDetail;
  mutationUnavailableReason?: string;
}) {
  const t = useI18n();
  const tUser = useI18n("user");
  const tCommon = useI18n("common");
  const { client, principal, demo } = useIdentity();
  const self = principal.user.id === user.id;
  const [previousPassword, setPreviousPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const disabled = Boolean(mutationUnavailableReason) || demo.enabled || action.pending;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || user.provider !== "credentials") return;
        const parsed = userChangePasswordApiSchema.safeParse(
          {
            userId: user.id,
            previousPassword: self ? previousPassword : "_",
            password,
            confirmPassword,
          },
          { error: zodErrorMap(t) },
        );
        if (!parsed.success) {
          setValidation(
            validationMessage(
              parsed.error.issues.map((issue) => ({
                path: [getUserFieldLabel(issue.path[0], t)],
                message: issue.message,
              })),
            ),
          );
          return;
        }
        setValidation(null);
        await action.run((signal) => client.user.changePassword(parsed.data, { signal }));
        setPreviousPassword("");
        setPassword("");
        setConfirmPassword("");
      }}
    >
      <Stack>
        <Text size="sm">
          <Code>user.changePassword ↛ sessions</Code>
        </Text>
        <Fieldset legend={tUser("action.changePassword.label")} disabled={disabled}>
          <Stack gap="xs">
            {self && (
              <PasswordInput
                label={tUser("field.previousPassword.label")}
                required
                autoComplete="current-password"
                value={previousPassword}
                onChange={(event) => setPreviousPassword(event.currentTarget.value)}
              />
            )}
            <UserPasswordInput
              label={tUser("field.password.label")}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            <PasswordInput
              label={tUser("field.passwordConfirm.label")}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            />
            <Group justify="end">
              <Button type="submit" disabled={disabled} loading={action.pending}>
                {tCommon("action.confirm")}
              </Button>
            </Group>
          </Stack>
        </Fieldset>
        {validation && <IdentityError error={validation} />}
        <ActionFeedback action={action} />
      </Stack>
    </form>
  );
}

function UserDelete({
  user,
  onDeleted,
  mutationUnavailableReason,
}: {
  user: UserDetail;
  onDeleted: () => void;
  mutationUnavailableReason?: string;
}) {
  const tUser = useI18n("user");
  const tCommon = useI18n("common");
  const { client, principal, demo } = useIdentity();
  const self = principal.user.id === user.id;
  const action = useIdentityAction();
  const disabled = Boolean(mutationUnavailableReason) || demo.enabled;
  return (
    <UserDangerZoneView
      action={
        <Stack gap="xs">
          <InlineConfirmButton
            color="red"
            variant="subtle"
            confirmLabel={tCommon("action.confirm")}
            disabled={disabled}
            loading={action.pending}
            onConfirm={async () => {
              if (disabled) return;
              await action.run(
                async (signal) => {
                  await client.user.delete({ userId: user.id }, { signal });
                  if (!signal.aborted && !self) onDeleted();
                },
                { refreshAuthority: self },
              );
            }}
          >
            {tUser("action.delete.label")}
          </InlineConfirmButton>
          <ActionFeedback action={action} />
        </Stack>
      }
    />
  );
}

export function IdentityRecordAvailability() {
  const tCommon = useI18n("common");
  return (
    <UserUnavailableView
      reason={
        <>
          <Code>accounts / sessions</Code>
          <Text size="sm">
            <Code>user.changePassword ↛ sessions</Code>
          </Text>
          <Group mt="sm">
            <Button variant="default" disabled>
              {tCommon("action.show")} <Code>accounts / sessions</Code>
            </Button>
            <Button variant="default" disabled>
              {tCommon("action.remove")} <Code>sessions</Code>
            </Button>
          </Group>
        </>
      }
    />
  );
}
