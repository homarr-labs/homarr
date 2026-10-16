"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  CopyButton,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck, IconCopy, IconMailPlus, IconUsersGroup } from "@tabler/icons-react";

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

export function WorkerLocalAccounts({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const { pool } = useWorkerWorkspace();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const load = useCallback(
    async () => setAccounts(await workerRequest<Accounts>(connection, "/remote/local-accounts")),
    [connection],
  );
  useEffect(() => {
    if (worker.grant.role === "owner") void load().catch((cause) => setError(errorMessage(cause)));
  }, [load, worker.grant.role]);
  if (worker.grant.role !== "owner")
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Title order={3}>Your local organization</Title>
          <Text size="sm" c="dimmed">
            Your sign-in details are stored on {worker.name}. Ask its administrator to manage your organization access.
          </Text>
        </Stack>
      </Paper>
    );
  async function perform(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setConfirmation(null);
      if (success) setNotice(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function openManagement(path: string) {
    if (busy) return;
    setBusy(true);
    setOpeningPath(path);
    setError("");
    setNotice("");
    try {
      const selected = pool.getSnapshot().workers.find((entry) => entry.worker.workerId === worker.workerId);
      if (!selected?.connected) await pool.restore(worker.workerId);
      pool.setPrimary(worker.workerId);
      router.push(path);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setOpeningPath(null);
      setBusy(false);
    }
  }
  async function mutate(path: string, method: string, body?: object) {
    await workerRequest(connection, `/remote/local-accounts${path}`, { method, body: body && JSON.stringify(body) });
  }
  return (
    <Stack>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert color="green" aria-live="polite">
          {notice}
        </Alert>
      )}
      {!accounts && !error && <Loader size="sm" aria-label="Loading local organization" />}
      <Paper withBorder p="md" radius="md">
        <Stack>
          <Group gap="sm">
            <IconUsersGroup size={22} />
            <Title order={3}>Your local organization</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Invite people to {worker.name}. Each user signs in with their own username, with access controlled by Homarr
            groups and board permissions.
          </Text>
          {accounts && !accounts.organization && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void perform(() => mutate("", "POST", { name }), "Organization created. You can now invite users.");
              }}
            >
              <Stack>
                <TextInput
                  label="Organization name"
                  placeholder="Home, family, or team name"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  required
                  maxLength={100}
                  disabled={busy}
                />
                <Group>
                  <Button type="submit" loading={busy}>
                    Create local organization
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
          {accounts?.organization && (
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                  {accounts.organization.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {accounts.members.length} users
                </Text>
              </Stack>
              <Button
                disabled={busy}
                loading={openingPath?.startsWith("/manage/users/groups/")}
                onClick={() => {
                  if (accounts.organization)
                    void openManagement(
                      `/manage/users/groups/${encodeURIComponent(accounts.organization.id)}/permissions`,
                    );
                }}
                variant="default"
                size="sm"
              >
                Group permissions
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>
      {accounts?.organization && (
        <>
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Title order={4}>Invite users</Title>
              <Text size="sm" c="dimmed">
                Send a private invitation so someone can choose their own username and password. Each invitation can be
                used once.
              </Text>
              <Group>
                <Button
                  leftSection={<IconMailPlus size={16} />}
                  loading={busy}
                  onClick={() =>
                    void perform(async () => {
                      const { invitation } = await workerRequest<{ invitation: { id: string; token: string } }>(
                        connection,
                        "/remote/local-accounts/invitations",
                        { method: "POST" },
                      );
                      setInvitationLink(accountLink(worker, invitation));
                    })
                  }
                >
                  Create invitation
                </Button>
                <CopyButton value={accountLink(worker)}>
                  {({ copied, copy }) => (
                    <Button variant="default" onClick={copy}>
                      {copied ? "Sign-in link copied" : "Copy sign-in link"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              {invitationLink && (
                <Alert color="blue" title="Invitation ready" aria-live="polite">
                  <Stack gap="xs">
                    <Text size="sm">Copy this link now and share it privately. It expires in 24 hours.</Text>
                    <TextInput
                      aria-label="Private invitation link"
                      value={invitationLink}
                      readOnly
                      data-private="true"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <CopyButton value={invitationLink}>
                      {({ copied, copy }) => (
                        <Button
                          size="sm"
                          variant="light"
                          leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          onClick={copy}
                        >
                          {copied ? "Copied" : "Copy invitation"}
                        </Button>
                      )}
                    </CopyButton>
                  </Stack>
                </Alert>
              )}
              {accounts.invitations.length > 0 && (
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    Pending invitations
                  </Text>
                  {accounts.invitations.map((invitation) => (
                    <Group key={invitation.id} justify="space-between">
                      <Text size="sm" c="dimmed">
                        Expires {new Date(invitation.expirationDate).toLocaleString()}
                      </Text>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
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
              )}
            </Stack>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Group justify="space-between">
                <Title order={4}>Local users</Title>
                <Button
                  disabled={busy}
                  loading={openingPath === "/manage/users"}
                  onClick={() => void openManagement("/manage/users")}
                  size="xs"
                  variant="subtle"
                >
                  Manage Homarr users
                </Button>
              </Group>
              {!accounts.members.length && (
                <Text size="sm" c="dimmed">
                  No users yet. Create an invitation to welcome someone.
                </Text>
              )}
              {accounts.members.map((member) => {
                const memberName = member.name || "Unnamed user";
                return (
                  <Paper key={member.id} withBorder p="sm" radius="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={6} style={{ minWidth: 0 }}>
                        <Text fw={500} style={{ overflowWrap: "anywhere" }}>
                          {memberName}
                        </Text>
                        <Badge size="sm" variant="light" color="gray">
                          {member.sessions} active sessions
                        </Badge>
                      </Stack>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="default"
                          disabled={busy || !member.sessions}
                          onClick={() =>
                            setConfirmation({
                              path: `/sessions/${encodeURIComponent(member.id)}`,
                              method: "POST",
                              title: `Sign out ${memberName}?`,
                              description:
                                "Their current worker sessions will end. They can sign in again with their username and password.",
                              action: "Sign out sessions",
                            })
                          }
                        >
                          Sign out sessions
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              path: `/members/${encodeURIComponent(member.id)}`,
                              method: "DELETE",
                              title: `Remove ${memberName}?`,
                              description:
                                "This removes their organization membership and ends their worker sessions. Their Homarr user remains available in Users.",
                              action: "Remove user",
                            })
                          }
                        >
                          Remove
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
              <Accordion variant="separated">
                <Accordion.Item value="create-account">
                  <Accordion.Control>Create a user</Accordion.Control>
                  <Accordion.Panel>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void perform(async () => {
                          await mutate("/members", "POST", { username, password });
                          setUsername("");
                          setPassword("");
                        }, "User created. Share their username, password, and sign-in link privately.");
                      }}
                    >
                      <Stack>
                        <Text size="sm" c="dimmed">
                          An invitation lets users choose their own password. You can also create a user here and share
                          its details privately.
                        </Text>
                        <TextInput
                          label="Username"
                          value={username}
                          onChange={(event) => setUsername(event.currentTarget.value)}
                          autoComplete="off"
                          required
                          minLength={3}
                          maxLength={255}
                          disabled={busy}
                        />
                        <PasswordInput
                          label="Password"
                          description="Use at least 8 characters."
                          value={password}
                          onChange={(event) => setPassword(event.currentTarget.value)}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          maxLength={72}
                          disabled={busy}
                        />
                        <Group>
                          <Button type="submit" variant="default" loading={busy}>
                            Create user
                          </Button>
                        </Group>
                      </Stack>
                    </form>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Paper>
          {confirmation && (
            <Modal
              opened
              onClose={() => {
                if (!busy) setConfirmation(null);
              }}
              title={confirmation.title}
              centered
              closeOnEscape={!busy}
              closeOnClickOutside={!busy}
            >
              <Stack gap="sm">
                <Text size="sm">{confirmation.description}</Text>
                {error && (
                  <Alert color="red" role="alert">
                    {error}
                  </Alert>
                )}
                <Group>
                  <Button
                    color="red"
                    size="sm"
                    loading={busy}
                    onClick={() =>
                      void perform(() => mutate(confirmation.path, confirmation.method), "Access updated.")
                    }
                  >
                    {confirmation.action}
                  </Button>
                  <Button variant="default" size="sm" disabled={busy} onClick={() => setConfirmation(null)}>
                    Cancel
                  </Button>
                </Group>
              </Stack>
            </Modal>
          )}
        </>
      )}
    </Stack>
  );
}
