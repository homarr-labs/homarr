import type { ComponentPropsWithRef } from "react";
import { createContext, useContext, useState } from "react";
import { Button, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { StepperNavigationView } from "@homarr/ui/source-views/identity-settings";
import type { IdentitySettingsLinkComponent } from "@homarr/ui/source-views/identity-settings";
import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form/i18n";
import { groupSavePermissionsSchema } from "@homarr/validation/group";

import { everyoneGroup } from "../../../../../packages/definitions/src/group";
import { getPermissionsWithChildren } from "../../../../../packages/definitions/src/permissions";
import { useIdentity, useIdentityKey } from "./boundary";
import { useIdentityAction } from "./feedback";
import {
  UserActionFeedbackView as ActionFeedback,
  UserUnavailableView as IdentityDenied,
  UserRequestErrorView as IdentityError,
  UserLoadingView as IdentityLoading,
  UserUnavailableView,
} from "../../source-ui/users/user-detail";
import { userCreateSchema, validationMessage } from "./validation";
import { PasswordSuggestionsView, UserCreateView } from "../../source-ui/users/user-create";
import { UserListView } from "../../source-ui/users/user-list";
import type { SelectedUserGroup, UserAvatarRenderer } from "../../source-ui/users/contracts";
import { getUserFieldLabel } from "../../source-ui/users/contracts";

const UserReturnContext = createContext<(() => void) | null>(null);

function UserListReturnLink({ href, onClick, children, ...props }: ComponentPropsWithRef<"a"> & { href: string }) {
  const onComplete = useContext(UserReturnContext);
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !onComplete ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        onComplete();
      }}
    >
      {children}
    </a>
  );
}

export function UserList({
  onOpen,
  onCreate,
  mutationUnavailableReason,
  renderAvatar,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
  mutationUnavailableReason?: string;
  renderAvatar?: UserAvatarRenderer;
}) {
  const tCommon = useI18n("common");
  const tCreate = useI18n("management.page.user.create");
  const { client, principal, enabledProviders, demo } = useIdentity();
  const key = useIdentityKey();
  const admin = principal.user.permissions.includes("admin");
  const query = useQuery({
    queryKey: [...key, "users"],
    queryFn: ({ signal }) => client.user.getAll(undefined, { signal }),
    enabled: admin,
  });
  if (!admin) return <IdentityDenied />;
  if (!query.data)
    return query.isError ? (
      <IdentityError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <IdentityLoading />
    );
  return (
    <Stack>
      <Group justify="space-between">
        <Title>{tCommon("entity.users")}</Title>
        {enabledProviders.includes("credentials") && (
          <Button onClick={onCreate} disabled={Boolean(mutationUnavailableReason) || (demo.enabled && demo.readOnly)}>
            {tCreate("metaTitle")}
          </Button>
        )}
      </Group>
      {mutationUnavailableReason && <UserUnavailableView reason={mutationUnavailableReason} />}
      {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
      <UserListView
        users={query.data}
        onOpen={onOpen}
        loading={false}
        refreshing={query.isFetching}
        renderAvatar={renderAvatar}
      />
    </Stack>
  );
}

export interface UserCreateProps {
  onComplete: () => void;
  linkComponent?: IdentitySettingsLinkComponent;
  mutationUnavailableReason?: string;
  renderAvatar?: UserAvatarRenderer;
}

export function UserCreate({ onComplete, linkComponent, mutationUnavailableReason, renderAvatar }: UserCreateProps) {
  const { client, principal, enabledProviders } = useIdentity();
  const key = useIdentityKey();
  const permitted = principal.user.permissions.includes("admin") && enabledProviders.includes("credentials");
  const query = useQuery({
    queryKey: [...key, "selectable-groups", true],
    queryFn: ({ signal }) => client.group.selectable({ withPermissions: true }, { signal }),
    enabled: permitted,
  });
  if (!permitted) return <IdentityDenied />;
  if (!query.data)
    return query.isError ? (
      <IdentityError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <IdentityLoading />
    );
  const groups: SelectedUserGroup[] = [];
  for (const group of query.data) {
    if (!("permissions" in group)) {
      return <UserUnavailableView reason="Group permissions are unavailable. User creation remains hidden." />;
    }
    const permissions = groupSavePermissionsSchema.shape.permissions.safeParse(group.permissions);
    if (!permissions.success) {
      return <UserUnavailableView reason="Group permissions are invalid. User creation remains hidden." />;
    }
    groups.push({ id: group.id, name: group.name, permissions: permissions.data });
  }
  return (
    <Stack>
      {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
      <UserCreateForm
        groups={groups}
        onComplete={onComplete}
        linkComponent={linkComponent}
        mutationUnavailableReason={mutationUnavailableReason}
        renderAvatar={renderAvatar}
      />
    </Stack>
  );
}

function UserCreateForm({
  groups,
  onComplete,
  linkComponent,
  mutationUnavailableReason,
  renderAvatar,
}: UserCreateProps & { groups: SelectedUserGroup[] }) {
  const t = useI18n();
  const tCommon = useI18n("common");
  const tCreate = useI18n("management.page.user.create");
  const { client, demo } = useIdentity();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const everyoneIds = groups.filter((group) => group.name === everyoneGroup).map((group) => group.id);
  const [groupIds, setGroupIds] = useState(everyoneIds);
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const disabled = Boolean(mutationUnavailableReason) || action.pending || (demo.enabled && demo.readOnly);
  async function nextStep() {
    if (disabled || step >= 4) return;
    const parsed = userCreateSchema.safeParse(
      { username, email, password, confirmPassword, groupIds },
      { error: zodErrorMap(t) },
    );
    let fields = ["groupIds"];
    if (step === 0) fields = ["username", "email"];
    if (step === 1) fields = ["password", "confirmPassword"];
    const issues = parsed.success
      ? []
      : parsed.error.issues.filter((issue) => step === 3 || fields.includes(String(issue.path[0])));
    if (issues.length) {
      setValidation(
        validationMessage(
          issues.map((issue) => ({ path: [getUserFieldLabel(issue.path[0], t)], message: issue.message })),
        ),
      );
      return;
    }
    setValidation(null);
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!parsed.success) return;
    await action.run((signal) => client.user.create(parsed.data, { signal }), {
      onSuccess: () => {
        setPassword("");
        setConfirmPassword("");
        setStep(4);
      },
    });
  }
  function reset() {
    setStep(0);
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setGroupIds(everyoneIds);
    setValidation(null);
    action.clear();
  }
  return (
    <UserReturnContext.Provider value={onComplete}>
      <UserCreateView
        renderAvatar={renderAvatar}
        step={step}
        username={username}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          permissions: group.permissions,
        }))}
        selectedGroupIds={groupIds}
        everyoneGroupName={everyoneGroup}
        effectivePermissions={getPermissionsWithChildren(
          groups.flatMap((group) => (groupIds.includes(group.id) ? group.permissions : [])),
        )}
        disabled={disabled}
        onUsernameChange={setUsername}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onGroupAdd={(id) => setGroupIds([...new Set([...everyoneIds, ...groupIds, id])])}
        onGroupRemove={(id) =>
          setGroupIds([...new Set([...everyoneIds, ...groupIds.filter((groupId) => groupId !== id)])])
        }
        feedback={
          <Stack>
            {mutationUnavailableReason && <UserUnavailableView reason={mutationUnavailableReason} />}
            {validation && <IdentityError error={validation} />}
            <ActionFeedback action={action} />
          </Stack>
        }
        navigation={
          <StepperNavigationView
            hasPrevious={step > 0}
            hasNext={!disabled}
            isComplete={step === 4}
            isLoadingNextStep={action.pending}
            prevStep={() => {
              if (!disabled) setStep(step - 1);
            }}
            nextStep={() => void nextStep()}
            reset={reset}
            previousLabel={tCommon("action.previous")}
            nextLabel={tCommon("action.next")}
            createAnotherLabel={tCreate("action.createAnother")}
            backLabel={tCreate("action.back")}
            backHref="/manage/users"
            linkComponent={linkComponent ?? UserListReturnLink}
          />
        }
      />
    </UserReturnContext.Provider>
  );
}

export function PasswordSuggestions({ password }: { password: string }) {
  return <PasswordSuggestionsView password={password} />;
}
