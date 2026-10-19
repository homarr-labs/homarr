"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, PasswordInput, Skeleton, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconChevronDown, IconMailPlus, IconPlus } from "@tabler/icons-react";

import { parseConnectionLink, shareLink, workerRequest } from "@homarr/worker-client";
import type { ConnectionInput, SavedWorker, WorkerConnection } from "@homarr/worker-client";

import { errorMessage } from "./platform";
import { useWorkerWorkspace } from "./context";
import { InlineConfirmation, InlinePanel, WorkerCopyButton, WorkerCopyField, workerConnectionKey } from "./ui";
import classes from "./worker-settings.module.css";

type Accounts = {
  organization: { id: string; name: string } | null;
  members: { id: string; name: string | null; provider: string; sessions: number }[];
  invitations: { id: string; expirationDate: string }[];
};
type Confirmation = {
  target: string;
  path: string;
  method: string;
  title: string;
  description: string;
  action: string;
};

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
  return <LocalAccountsPanel key={`${props.worker.workerId}:${workerConnectionKey(props.connection)}`} {...props} />;
}

function LocalAccountsPanel({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const { pool } = useWorkerWorkspace();
  const router = useRouter();
  const active = useRef(true);
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [form, setForm] = useState<"invite" | "create" | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const result = await workerRequest<Accounts>(connection, "/remote/local-accounts", { signal });
      if (active.current && !signal?.aborted) setAccounts(result);
    },
    [connection],
  );

  useEffect(() => {
    const controller = new AbortController();
    active.current = true;
    if (worker.grant.role === "owner")
      void load(controller.signal).catch((cause) => {
        if (active.current && !controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [load, worker.grant.role]);

  async function perform(action: () => Promise<void>, success?: string) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (!active.current) return false;
      setConfirmation(null);
      if (success) setNotice(success);
      try {
        await load();
      } catch (cause) {
        if (active.current) setError(`Saved. Could not refresh the list: ${errorMessage(cause)}`);
      }
      return true;
    } catch (cause) {
      if (active.current) setError(errorMessage(cause));
      return false;
    } finally {
      if (active.current) setBusy(false);
    }
  }

  async function openManagement(path: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const selected = pool.getSnapshot().workers.find((entry) => entry.worker.workerId === worker.workerId);
      if (!selected?.connected) await pool.restore(worker.workerId);
      if (!active.current) return;
      pool.setPrimary(worker.workerId);
      router.push(path);
    } catch (cause) {
      if (active.current) setError(errorMessage(cause));
    } finally {
      if (active.current) setBusy(false);
    }
  }

  async function mutate(path: string, method: string, body?: object) {
    await workerRequest(connection, `/remote/local-accounts${path}`, { method, body: body && JSON.stringify(body) });
  }

  function closeForm() {
    if (busy) return;
    setForm(null);
    setPassword("");
    setInvitationLink("");
    setError("");
  }

  async function invite() {
    if (busy) return;
    setForm("invite");
    setInvitationLink("");
    await perform(async () => {
      const { invitation } = await workerRequest<{ invitation: { id: string; token: string } }>(
        connection,
        "/remote/local-accounts/invitations",
        { method: "POST" },
      );
      if (active.current) setInvitationLink(accountLink(worker, invitation));
    });
  }

  const pendingInvitations = (accounts?.invitations ?? []).filter(
    (invitation) => new Date(invitation.expirationDate).getTime() > Date.now(),
  );

  if (worker.grant.role !== "owner")
    return (
      <Text size="sm" c="dimmed">
        Ask your administrator to manage users and organization access.
      </Text>
    );

  return (
    <Stack gap="xl">
      <div className={classes.sectionHeader}>
        <div>
          <Title order={3} className={classes.sectionHeading}>
            Users
          </Title>
          {!accounts?.organization && (
            <Text size="sm" c="dimmed" className={classes.prose}>
              Give people their own username and password for this worker.
            </Text>
          )}
          {accounts?.organization && (
            <Text size="sm" c="dimmed">
              {accounts.organization.name} · {accounts.members.length} users
            </Text>
          )}
        </div>
        {accounts?.organization && (
          <Group gap="xs">
            <Button
              size="sm"
              leftSection={<IconMailPlus size={16} />}
              disabled={busy}
              onClick={() => void invite()}
              aria-expanded={form === "invite"}
            >
              Invite user
            </Button>
            <Button
              size="sm"
              variant="default"
              leftSection={<IconPlus size={16} />}
              disabled={busy}
              onClick={() => {
                setForm("create");
                setUsername("");
                setPassword("");
                setError("");
                setConfirmation(null);
              }}
              aria-expanded={form === "create"}
            >
              Create user
            </Button>
          </Group>
        )}
      </div>
      {error && !form && !confirmation && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Text component="output" size="sm" c="green">
          {notice}
        </Text>
      )}
      {!accounts && !error && (
        <Stack gap="sm" aria-label="Loading users" aria-busy="true">
          <Skeleton height={36} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </Stack>
      )}
      {!accounts && error && (
        <Group>
          <Button variant="default" size="sm" onClick={() => void perform(() => load())}>
            Retry
          </Button>
        </Group>
      )}
      {accounts && !accounts.organization && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void perform(() => mutate("", "POST", { name: name.trim() }), "Organization created.");
          }}
        >
          <Stack gap="md" className={classes.formFields}>
            <Text size="sm" c="dimmed">
              Create an organization to group the people using this worker.
            </Text>
            <TextInput
              label="Organization name"
              placeholder="Home, family or team"
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
          {form === "invite" && (
            <InlinePanel title="Invite a user">
              <Text size="sm" c="dimmed" className={classes.prose}>
                One person can use this link to choose their username and password. It expires in 24 hours.
              </Text>
              {busy && !invitationLink && <Skeleton height={36} aria-label="Creating invitation" />}
              {error && (
                <Text size="sm" c="red" role="alert">
                  {error}
                </Text>
              )}
              {invitationLink && <WorkerCopyField label="Private invitation link" value={invitationLink} />}
              <Group gap="sm">
                {!invitationLink && !busy && (
                  <Button size="sm" onClick={() => void invite()}>
                    Try again
                  </Button>
                )}
                <Button variant="default" size="sm" disabled={busy} onClick={closeForm}>
                  {invitationLink ? "Done" : "Cancel"}
                </Button>
              </Group>
            </InlinePanel>
          )}
          {form === "create" && (
            <InlinePanel title="Create a user">
              <Text size="sm" c="dimmed" className={classes.prose}>
                Set their username and password, then share the sign-in link privately.
              </Text>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void (async () => {
                    const created = await perform(
                      () => mutate("/members", "POST", { username: username.trim(), password }),
                      "User created. Share their sign-in link, username and password privately.",
                    );
                    if (created && active.current) {
                      setPassword("");
                      setForm(null);
                    }
                  })();
                }}
              >
                <Stack gap="md" className={classes.formFields}>
                  <div className={classes.fieldGrid}>
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
                      description="Use 8–72 characters."
                      value={password}
                      onChange={(event) => setPassword(event.currentTarget.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      disabled={busy}
                    />
                  </div>
                  {error && (
                    <Text size="sm" c="red" role="alert">
                      {error}
                    </Text>
                  )}
                  <Group gap="sm">
                    <Button type="submit" size="sm" loading={busy}>
                      Create user
                    </Button>
                    <Button variant="default" size="sm" disabled={busy} onClick={closeForm}>
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </form>
            </InlinePanel>
          )}
          <Group justify="space-between" gap="sm">
            <WorkerCopyButton value={accountLink(worker)} label="Copy sign-in link" variant="subtle" disabled={busy} />
            <Button
              size="sm"
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
          {!accounts.members.length && (
            <Text size="sm" c="dimmed" className={classes.emptyState}>
              No users yet. Invite someone to let them choose their own sign-in details.
            </Text>
          )}
          {accounts.members.length > 0 && (
            <ul className={classes.list} aria-label="Organization users">
              {accounts.members.map((member) => {
                const memberName = member.name || "Unnamed user";
                const expanded = expandedMember === member.id;
                const confirming = confirmation?.target === member.id;
                return (
                  <li key={member.id} className={classes.listRow}>
                    <div className={classes.rowContent}>
                      <div className={classes.rowInfo}>
                        <Text size="sm" fw={600}>
                          {memberName}
                        </Text>
                        <Text size="sm" c="dimmed" mt={2}>
                          {member.sessions} active sessions
                        </Text>
                      </div>
                      <Button
                        variant="subtle"
                        size="sm"
                        disabled={busy}
                        rightSection={
                          <IconChevronDown size={16} style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
                        }
                        aria-expanded={expanded}
                        onClick={() => {
                          setExpandedMember(expanded ? null : member.id);
                          setConfirmation(null);
                          setError("");
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                    {expanded && !confirming && (
                      <Group gap="xs" mt="md">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={busy}
                          onClick={() => void openManagement(`/manage/users/${encodeURIComponent(member.id)}/general`)}
                        >
                          User settings
                        </Button>
                        {member.provider === "credentials" && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void openManagement(`/manage/users/${encodeURIComponent(member.id)}/security`)
                            }
                          >
                            Change password
                          </Button>
                        )}
                        <Button
                          variant="subtle"
                          size="sm"
                          disabled={busy || !member.sessions}
                          onClick={() =>
                            setConfirmation({
                              target: member.id,
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
                        </Button>
                        <Button
                          variant="subtle"
                          color="red"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              target: member.id,
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
                        </Button>
                      </Group>
                    )}
                    {confirming && (
                      <div className={classes.rowDetails}>
                        <InlineConfirmation
                          title={confirmation.title}
                          description={confirmation.description}
                          action={confirmation.action}
                          busy={busy}
                          onCancel={() => {
                            setConfirmation(null);
                            setError("");
                          }}
                          onConfirm={() =>
                            void perform(() => mutate(confirmation.path, confirmation.method), "Access updated.")
                          }
                          error={error}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {pendingInvitations.length > 0 && (
            <details className={classes.details}>
              <summary>Pending invitations ({pendingInvitations.length})</summary>
              <ul className={`${classes.detailsContent} ${classes.list}`}>
                {pendingInvitations.map((invitation) => (
                  <li key={invitation.id} className={classes.listRow}>
                    <div className={classes.rowContent}>
                      <Text size="sm" c="dimmed">
                        Expires {new Date(invitation.expirationDate).toLocaleString()}
                      </Text>
                      <Button
                        size="sm"
                        color="red"
                        variant="subtle"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setConfirmation({
                            target: invitation.id,
                            path: `/invitations/${encodeURIComponent(invitation.id)}`,
                            method: "DELETE",
                            title: "Revoke this invitation?",
                            description: "Anyone with this invitation link will no longer be able to join.",
                            action: "Revoke invitation",
                          });
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                    {confirmation?.target === invitation.id && (
                      <div className={classes.rowDetails}>
                        <InlineConfirmation
                          title={confirmation.title}
                          description={confirmation.description}
                          action={confirmation.action}
                          busy={busy}
                          onCancel={() => {
                            setConfirmation(null);
                            setError("");
                          }}
                          onConfirm={() =>
                            void perform(() => mutate(confirmation.path, confirmation.method), "Invitation revoked.")
                          }
                          error={error}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <Group>
            <Button variant="subtle" size="sm" disabled={busy} onClick={() => void openManagement("/manage/users")}>
              Manage all Homarr users
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
