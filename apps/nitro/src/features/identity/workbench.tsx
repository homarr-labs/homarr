import { useState } from "react";
import { Alert, Button, Group, Stack } from "@mantine/core";

import type { GroupPresentation } from "../../source-ui/groups/contracts";
import { useIdentity } from "./boundary";
import { ApiKeyAdministration } from "./api-keys";
import { GroupEditor, GroupListPage } from "./groups";
import { InviteAdministration } from "./invites";
import { UserEditor } from "./user-detail";
import { UserCreate, UserList } from "./users";

export type IdentityView =
  | { kind: "users" }
  | { kind: "create-user" }
  | { kind: "user"; id: string }
  | { kind: "groups" }
  | { kind: "group"; id: string }
  | { kind: "invites" }
  | { kind: "api-keys" };

export function IdentityWorkbench({
  initialView,
  groupPresentation,
}: {
  initialView?: IdentityView;
  groupPresentation: GroupPresentation;
}) {
  const { principal, enabledProviders, demo } = useIdentity();
  const admin = principal.user.permissions.includes("admin");
  const [view, setView] = useState<IdentityView>(() => initialView ?? { kind: "user", id: principal.user.id });
  return (
    <Stack gap="lg">
      <Group component="nav" aria-label="Identity administration">
        <Button variant="default" onClick={() => setView({ kind: "user", id: principal.user.id })}>
          My profile
        </Button>
        {admin && (
          <>
            <Button variant="default" onClick={() => setView({ kind: "users" })}>
              Users
            </Button>
            <Button variant="default" onClick={() => setView({ kind: "groups" })}>
              Groups
            </Button>
            {enabledProviders.includes("credentials") && (
              <Button variant="default" onClick={() => setView({ kind: "invites" })}>
                Invitations
              </Button>
            )}
            <Button variant="default" onClick={() => setView({ kind: "api-keys" })}>
              API keys
            </Button>
          </>
        )}
      </Group>
      {demo.enabled && (
        <Alert title="Demo mode">
          {demo.readOnly
            ? "All identity mutations are disabled."
            : "User deletion, password changes and username changes are disabled."}
        </Alert>
      )}
      <IdentityScreen key={JSON.stringify(view)} view={view} setView={setView} groupPresentation={groupPresentation} />
    </Stack>
  );
}

function IdentityScreen({
  view,
  setView,
  groupPresentation,
}: {
  view: IdentityView;
  setView: (view: IdentityView) => void;
  groupPresentation: GroupPresentation;
}) {
  switch (view.kind) {
    case "users":
      return (
        <UserList onOpen={(id) => setView({ kind: "user", id })} onCreate={() => setView({ kind: "create-user" })} />
      );
    case "create-user":
      return <UserCreate onComplete={() => setView({ kind: "users" })} />;
    case "user":
      return <UserEditor userId={view.id} onDeleted={() => setView({ kind: "users" })} />;
    case "groups":
      return <GroupListPage presentation={groupPresentation} />;
    case "group":
      return <GroupEditor groupId={view.id} presentation={groupPresentation} />;
    case "invites":
      return <InviteAdministration />;
    case "api-keys":
      return <ApiKeyAdministration />;
  }
}
