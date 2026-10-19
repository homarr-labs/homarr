"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  Group,
  Menu,
  Modal,
  PasswordInput,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck, IconCopy, IconDots, IconMailPlus, IconPlus } from "@tabler/icons-react";

import { parseConnectionLink, shareLink, workerRequest } from "@homarr/worker-client";
import type { ConnectionInput, SavedWorker, WorkerConnection } from "@homarr/worker-client";

import { errorMessage } from "./platform";
import { useWorkerWorkspace } from "./context";

type Accounts = {
  organization: { id: string; name: string } | null;
  members: { id: string; name: string | null; provider: string; sessions: number }[];
  invitations: { id: string; expirationDate: string }[];
};
type Confirmation = { path: string; method: string; title: string; description: string; action: string };

function accountLink(worker: SavedWorker, invitation?: { id: string; token: string }) {
  const url = new URL(shareLink(worker, "placeholder", "invite", worker.name));
  const fragment = new URLSearchParams(url.hash.slice(1));
  fragment.delete("invite");
  if (invitation) {
    fragment.set("localInvite", invitation.id);
    fragment.set("token", invitation.token);
  } else fragment.set("login", "1");
  url.hash = fragment.toString();
  return url.href;
}

export function WorkerLocalLoginLink({
  link,
  onConnect,
}: {
  link: string;
  onConnect: (input: ConnectionInput) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setSignIn(false);
    setPassword("");
    setPasswordConfirmation("");
    setError("");
  }, [link]);
  let input: ConnectionInput;
  try {
    input = parseConnectionLink(link);
  } catch {
    return null;
  }
  if (input.credential.kind !== "local-register" && input.credential.kind !== "local-login") return null;
  const registering = input.credential.kind === "local-register" && !signIn;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (registering && password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (input.credential.kind !== "local-register" && input.credential.kind !== "local-login") return;
      let credential = { ...input.credential, username, password };
      if (!registering) credential = { kind: "local-login", username, password };
      await onConnect({ ...input, credential });
      setPassword("");
      setPasswordConfirmation("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  let action = "Sign in and open Homarr";
  let title = "Sign in to your worker";
  let description = "Use the username and password you created for this worker.";
  let autocomplete = "current-password";
  if (registering) {
    action = "Join and open Homarr";
    title = "Join your organization";
    description = "Choose a username and password to accept this invitation. Your sign-in details stay on this worker.";
    autocomplete = "new-password";
  }
  return (
    <form onSubmit={(event) => void submit(event)}>
      <Stack mt="md">
        <div>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {description}
          </Text>
        </div>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <TextInput
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={255}
          disabled={busy}
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          autoComplete={autocomplete}
          required
          minLength={8}
          maxLength={72}
          disabled={busy}
          description={registering && "Use at least 8 characters."}
        />
        {registering && (
          <PasswordInput
            label="Confirm password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.currentTarget.value)}
            autoComplete="new-password"
            required
            disabled={busy}
          />
        )}
        <Button type="submit" loading={busy}>
          {action}
        </Button>
        {input.credential.kind === "local-register" && (
          <Button
            variant="subtle"
            disabled={busy}
            onClick={() => {
              setSignIn(!signIn);
              setError("");
            }}
          >
            {registering ? "Already joined? Sign in" : "Use invitation to create a user"}
          </Button>
        )}
      </Stack>
    </form>
  );
}

export function WorkerLocalAccounts(props: { worker: SavedWorker; connection: WorkerConnection }) {
  return <LocalAccountsPanel key={props.worker.workerId} {...props} />;
}

function LocalAccountsPanel({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const { pool } = useWorkerWorkspace();
  const router = useRouter();
  const active = useRef(true);
  const currentConnection = useRef(connection);
  currentConnection.current = connection;
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [dialog, setDialog] = useState<"invite" | "create" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const isCurrent = useCallback(() => active.current && currentConnection.current === connection, [connection]);
  const load = useCallback(async () => {
    const result = await workerRequest<Accounts>(connection, "/remote/local-accounts");
    if (isCurrent()) setAccounts(result);
  }, [connection, isCurrent]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (worker.grant.role === "owner")
      void load().catch((cause) => {
        if (isCurrent()) setError(errorMessage(cause));
      });
  }, [load, isCurrent, worker.grant.role]);

  if (worker.grant.role !== "owner")
    return (
      <Text size="sm" c="dimmed">
        Ask your administrator to manage users and organization access.
      </Text>
    );

  async function perform(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (!isCurrent()) return false;
      await load();
      if (!isCurrent()) return false;
      setConfirmation(null);
      if (success) setNotice(success);
      return true;
    } catch (cause) {
      if (isCurrent()) setError(errorMessage(cause));
      return false;
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  async function openManagement(path: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const selected = pool.getSnapshot().workers.find((entry) => entry.worker.workerId === worker.workerId);
      if (!selected?.connected) await pool.restore(worker.workerId);
      if (!isCurrent()) return;
      pool.setPrimary(worker.workerId);
      router.push(path);
    } catch (cause) {
      if (isCurrent()) setError(errorMessage(cause));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  async function mutate(path: string, method: string, body?: object) {
    await workerRequest(connection, `/remote/local-accounts${path}`, { method, body: body && JSON.stringify(body) });
  }
  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setPassword("");
    setError("");
  }
  let dialogTitle = "Invite a user";
  if (dialog === "create") dialogTitle = "Create a user";
  return (
    <Stack gap="md">
      {error && !dialog && !confirmation && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert color="green" aria-live="polite">
          {notice}
        </Alert>
      )}
      {!accounts && !error && (
        <Stack gap="sm" aria-label="Loading users" aria-busy="true">
          <Skeleton height={32} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </Stack>
      )}
      {!accounts && error && (
        <Button variant="default" size="sm" onClick={() => void perform(load)}>
          Retry
        </Button>
      )}
      {accounts && !accounts.organization && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void perform(() => mutate("", "POST", { name }), "Organization created.");
          }}
        >
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Create an organization to add users with their own username and password.
            </Text>
            <TextInput
              label="Organization name"
              placeholder="Home, family, or team"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              maxLength={64}
              disabled={busy}
            />
            <Group>
              <Button type="submit" size="sm" loading={busy}>
                Create organization
              </Button>
            </Group>
          </Stack>
        </form>
      )}
      {accounts?.organization && (
        <>
          <Group justify="space-between" align="flex-start" gap="sm">
            <div style={{ minWidth: 0 }}>
              <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                {accounts.organization.name}
              </Text>
              <Text size="sm" c="dimmed">
                {accounts.members.length} users · Username and password sign-in
              </Text>
            </div>
            <Button
              size="xs"
              variant="subtle"
              disabled={busy}
              onClick={() => {
                if (accounts.organization)
                  void openManagement(
                    `/manage/users/groups/${encodeURIComponent(accounts.organization.id)}/permissions`,
                  );
              }}
            >
              Group permissions
            </Button>
          </Group>
          <Group justify="space-between" gap="xs">
            <Group gap="xs">
              <Button
                size="sm"
                leftSection={<IconMailPlus size={16} />}
                disabled={busy}
                onClick={() => {
                  setInvitationLink("");
                  setError("");
                  setDialog("invite");
                }}
              >
                Invite user
              </Button>
              <Button
                size="sm"
                variant="default"
                leftSection={<IconPlus size={16} />}
                disabled={busy}
                onClick={() => {
                  setUsername("");
                  setPassword("");
                  setError("");
                  setDialog("create");
                }}
              >
                Create user
              </Button>
            </Group>
            <CopyButton value={accountLink(worker)}>
              {({ copied, copy }) => (
                <Button size="xs" variant="subtle" onClick={copy}>
                  {copied ? "Copied sign-in link" : "Copy sign-in link"}
                </Button>
              )}
            </CopyButton>
          </Group>
          {!accounts.members.length && (
            <Text size="sm" c="dimmed" py="md">
              No users yet. Invite someone or create their account.
            </Text>
          )}
          {accounts.members.length > 0 && (
            <Table.ScrollContainer minWidth={360}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Username</Table.Th>
                    <Table.Th>Sessions</Table.Th>
                    <Table.Th w={48}>
                      <Text size="xs" span>
                        Actions
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {accounts.members.map((member) => {
                    const memberName = member.name || "Unnamed user";
                    return (
                      <Table.Tr key={member.id}>
                        <Table.Td>
                          <Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>
                            {memberName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {member.sessions}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Menu position="bottom-end" withinPortal>
                            <Menu.Target>
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                aria-label={`Actions for ${memberName}`}
                                disabled={busy}
                              >
                                <IconDots size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                onClick={() =>
                                  void openManagement(`/manage/users/${encodeURIComponent(member.id)}/general`)
                                }
                              >
                                User settings
                              </Menu.Item>
                              {member.provider === "credentials" && (
                                <Menu.Item
                                  onClick={() =>
                                    void openManagement(`/manage/users/${encodeURIComponent(member.id)}/security`)
                                  }
                                >
                                  Change password
                                </Menu.Item>
                              )}
                              <Menu.Item
                                disabled={!member.sessions}
                                onClick={() =>
                                  setConfirmation({
                                    path: `/sessions/${encodeURIComponent(member.id)}`,
                                    method: "POST",
                                    title: `Sign out ${memberName}?`,
                                    description:
                                      "Their active worker sessions will end. They can sign in again with their username and password.",
                                    action: "Sign out sessions",
                                  })
                                }
                              >
                                Sign out sessions
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                onClick={() =>
                                  setConfirmation({
                                    path: `/members/${encodeURIComponent(member.id)}`,
                                    method: "DELETE",
                                    title: `Remove ${memberName}?`,
                                    description:
                                      "This removes their organization access and ends their worker sessions. Their Homarr user account is kept.",
                                    action: "Remove user",
                                  })
                                }
                              >
                                Remove from organization
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
          {accounts.invitations.length > 0 && (
            <Accordion variant="default">
              <Accordion.Item value="invitations">
                <Accordion.Control>Pending invitations ({accounts.invitations.length})</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {accounts.invitations.map((invitation) => (
                      <Group key={invitation.id} justify="space-between" gap="xs" wrap="wrap">
                        <Text size="sm" c="dimmed">
                          Expires {new Date(invitation.expirationDate).toLocaleString()}
                        </Text>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              path: `/invitations/${encodeURIComponent(invitation.id)}`,
                              method: "DELETE",
                              title: "Revoke invitation?",
                              description: "Anyone with this invitation link will no longer be able to join.",
                              action: "Revoke invitation",
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          )}
          <Button
            variant="subtle"
            size="xs"
            disabled={busy}
            onClick={() => void openManagement("/manage/users")}
            style={{ alignSelf: "flex-start" }}
          >
            Manage all Homarr users
          </Button>
        </>
      )}
      <Modal
        opened={dialog !== null}
        onClose={closeDialog}
        title={dialogTitle}
        centered
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
        withCloseButton={!busy}
      >
        <Stack gap="sm">
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {dialog === "invite" && (
            <>
              {!invitationLink && (
                <>
                  <Text size="sm" c="dimmed">
                    One person can use this private link to choose their username and password. It expires in 24 hours.
                  </Text>
                  <Group justify="flex-end">
                    <Button variant="default" disabled={busy} onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button
                      loading={busy}
                      onClick={() =>
                        void perform(async () => {
                          const { invitation } = await workerRequest<{ invitation: { id: string; token: string } }>(
                            connection,
                            "/remote/local-accounts/invitations",
                            { method: "POST" },
                          );
                          if (isCurrent()) setInvitationLink(accountLink(worker, invitation));
                        })
                      }
                    >
                      Create invitation
                    </Button>
                  </Group>
                </>
              )}
              {invitationLink && (
                <>
                  <Text size="sm" c="dimmed">
                    Share this link privately. Copy it before closing.
                  </Text>
                  <TextInput
                    label="Invitation link"
                    value={invitationLink}
                    readOnly
                    data-private="true"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Group justify="flex-end">
                    <Button variant="default" onClick={closeDialog}>
                      Done
                    </Button>
                    <CopyButton value={invitationLink}>
                      {({ copied, copy }) => (
                        <Button onClick={copy} leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}>
                          {copied ? "Copied" : "Copy invitation"}
                        </Button>
                      )}
                    </CopyButton>
                  </Group>
                </>
              )}
            </>
          )}
          {dialog === "create" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  const created = await perform(
                    () => mutate("/members", "POST", { username, password }),
                    "User created. Share their sign-in link, username, and password privately.",
                  );
                  if (created && isCurrent()) {
                    setPassword("");
                    setDialog(null);
                  }
                })();
              }}
            >
              <Stack gap="sm">
                <TextInput
                  label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.currentTarget.value)}
                  autoComplete="off"
                  required
                  minLength={3}
                  maxLength={255}
                  disabled={busy}
                  data-autofocus
                />
                <PasswordInput
                  label="Password"
                  description="Use 8–72 characters."
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  disabled={busy}
                />
                <Group justify="flex-end">
                  <Button variant="default" disabled={busy} onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={busy}>
                    Create user
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Stack>
      </Modal>
      {confirmation && (
        <Modal
          opened
          onClose={() => {
            if (!busy) {
              setConfirmation(null);
              setError("");
            }
          }}
          title={confirmation.title}
          centered
          closeOnEscape={!busy}
          closeOnClickOutside={!busy}
          withCloseButton={!busy}
        >
          <Stack gap="sm">
            <Text size="sm">{confirmation.description}</Text>
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button
                variant="default"
                disabled={busy}
                onClick={() => {
                  setConfirmation(null);
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={busy}
                onClick={() => void perform(() => mutate(confirmation.path, confirmation.method), "Access updated.")}
              >
                {confirmation.action}
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
