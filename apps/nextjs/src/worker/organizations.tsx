"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  Divider,
  Group,
  NativeSelect,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import type {
  Organization,
  OrganizationInvite,
  OrganizationMember,
  OrganizationWorkerConnection,
  WorkerConnection,
} from "@homarr/remote-platform/types";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { errorMessage, usePlatformAccount } from "./platform";

export function WorkerOrganizations() {
  const { session, request } = usePlatformAccount();
  const { pool, organizationId, setOrganizationId } = useWorkerWorkspace();
  const connections = useWorkerConnections();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workers, setWorkers] = useState<OrganizationWorkerConnection[]>([]);
  const [personal, setPersonal] = useState<WorkerConnection[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [attachId, setAttachId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadGeneration = useRef(0);
  const selected = organizations.find((organization) => organization.organizationId === organizationId);
  const canManage = selected?.role === "owner" || selected?.role === "admin";
  const base = `/api/organizations/${encodeURIComponent(organizationId ?? "")}`;

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!session.user) {
      setOrganizations([]);
      setWorkers([]);
      setPersonal([]);
      setMembers([]);
      setInvites([]);
      return;
    }
    const [directory, account] = await Promise.all([
      request<{ organizations: Organization[] }>("/api/organizations"),
      request<{ workers: WorkerConnection[] }>("/api/workers"),
    ]);
    if (generation !== loadGeneration.current) return;
    setOrganizations(directory.organizations);
    setPersonal(account.workers);
    const current = directory.organizations.find((organization) => organization.organizationId === organizationId);
    if (!current) {
      setWorkers([]);
      setMembers([]);
      setInvites([]);
      if (organizationId) setOrganizationId(null);
      return;
    }
    const prefix = `/api/organizations/${encodeURIComponent(current.organizationId)}`;
    let invitations = Promise.resolve({ invites: [] as OrganizationInvite[] });
    if (current.role !== "member") invitations = request<{ invites: OrganizationInvite[] }>(`${prefix}/invites`);
    const [workerResult, memberResult, inviteResult] = await Promise.all([
      request<{ workers: OrganizationWorkerConnection[] }>(`${prefix}/workers`),
      request<{ members: OrganizationMember[] }>(`${prefix}/members`),
      invitations,
    ]);
    if (generation !== loadGeneration.current) return;
    setWorkers(workerResult.workers);
    setMembers(memberResult.members);
    setInvites(inviteResult.invites);
  }, [organizationId, request, session.user, setOrganizationId]);

  useEffect(() => {
    setError("");
    setInviteCode("");
    setAttachId("");
    void load().catch((cause) => setError(errorMessage(cause)));
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);

  async function mutate(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    void mutate(async () => {
      const result = await request<{ organization: Organization }>("/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      setOrganizationId(result.organization.organizationId);
    });
  }

  function redeem(event: FormEvent) {
    event.preventDefault();
    void mutate(async () => {
      const result = await request<{ organization: Organization }>("/api/organization-invites/redeem", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setCode("");
      setOrganizationId(result.organization.organizationId);
    });
  }

  async function openWorker(worker: OrganizationWorkerConnection) {
    const saved = pool.getWorker(worker.workerId);
    if (!saved)
      throw new Error("Connect this worker with its private setup or invitation link in the Workers tab first.");
    await pool.connectInput({
      ...saved,
      mode: worker.mode,
      directUrl: worker.directUrl ?? "",
      relayUrl: worker.relayUrl ?? "",
    });
    pool.setPrimary(worker.workerId);
  }

  async function chooseOrganization(value: string | null) {
    setOrganizationId(value);
    if (!value) return;
    const result = await request<{ workers: OrganizationWorkerConnection[] }>(
      `/api/organizations/${encodeURIComponent(value)}/workers`,
    );
    const primary = result.workers.find((worker) => worker.purpose === "primary");
    if (!primary) return;
    if (!pool.getWorker(primary.workerId))
      throw new Error(
        `Organization selected. Connect ${primary.name} with its private setup or invitation link in Workers to open its dashboard.`,
      );
    await openWorker(primary);
  }

  if (!session.user)
    return <Text c="dimmed">Sign in from the Account tab to organize your workers and invite people.</Text>;

  const available = personal.filter(
    (worker) => worker.role === "owner" && !workers.some((entry) => entry.workerId === worker.workerId),
  );
  return (
    <Stack gap="lg">
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      <NativeSelect
        label="Organization"
        disabled={busy}
        value={organizationId ?? ""}
        onChange={(event) => {
          const value = event.currentTarget.value || null;
          void mutate(() => chooseOrganization(value));
        }}
        data={[
          { value: "", label: "Personal workers" },
          ...organizations.map((organization) => ({ value: organization.organizationId, label: organization.name })),
        ]}
      />
      <Paper withBorder p="md" radius="md">
        <form onSubmit={create}>
          <Group align="end">
            <TextInput
              label="New organization"
              placeholder="Home, family or team"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button type="submit" loading={busy}>
              Create organization
            </Button>
          </Group>
        </form>
        <form onSubmit={redeem}>
          <Group align="end" mt="md">
            <TextInput
              label="Organization invitation code"
              required
              value={code}
              onChange={(event) => setCode(event.currentTarget.value)}
              autoComplete="off"
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="light" loading={busy}>
              Join organization
            </Button>
          </Group>
        </form>
      </Paper>
      {selected && (
        <>
          <Group justify="space-between">
            <Title order={3}>{selected.name}</Title>
            <Badge variant="light">{selected.role}</Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Your primary worker stores dashboards. Other workers provide integrations. Each worker approves private
            access separately.
          </Text>
          {workers.map((worker) => {
            const local = connections.workers.find((entry) => entry.worker.workerId === worker.workerId);
            let access = "Pair this browser in Workers";
            if (local) access = "Private access saved on this browser";
            if (local?.connected) access = "Connected";
            return (
              <Paper key={worker.workerId} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{worker.name}</Text>
                      <Text size="xs" c="dimmed">
                        {access}
                      </Text>
                    </div>
                    <Badge variant="light">{worker.purpose}</Badge>
                  </Group>
                  <Group>
                    {local && (
                      <Button size="xs" loading={busy} onClick={() => void mutate(() => openWorker(worker))}>
                        Open this worker
                      </Button>
                    )}
                    {canManage && worker.purpose !== "primary" && (
                      <Button
                        size="xs"
                        variant="light"
                        disabled={busy}
                        onClick={() =>
                          void mutate(async () => {
                            const result = await request<{ worker: OrganizationWorkerConnection }>(
                              `${base}/workers/${encodeURIComponent(worker.workerId)}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({ purpose: "primary" }),
                              },
                            );
                            if (pool.getWorker(worker.workerId)) await openWorker(result.worker);
                          })
                        }
                      >
                        Make primary
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        disabled={busy}
                        onClick={() =>
                          void mutate(async () => {
                            await request(`${base}/workers/${encodeURIComponent(worker.workerId)}`, {
                              method: "DELETE",
                            });
                          })
                        }
                      >
                        Remove from organization
                      </Button>
                    )}
                  </Group>
                  <OrganizationConnection
                    key={`${worker.workerId}:${worker.mode}:${worker.directUrl}:${worker.relayUrl}`}
                    worker={worker}
                    busy={busy}
                    onSave={(input) =>
                      mutate(async () => {
                        const result = await request<{ worker: OrganizationWorkerConnection }>(
                          `${base}/workers/${encodeURIComponent(worker.workerId)}/connection`,
                          { method: "PATCH", body: JSON.stringify(input) },
                        );
                        const saved = pool.getWorker(worker.workerId);
                        if (saved && local?.connected)
                          await pool.connectInput({
                            ...saved,
                            mode: result.worker.mode,
                            directUrl: result.worker.directUrl ?? "",
                            relayUrl: result.worker.relayUrl ?? "",
                          });
                      })
                    }
                  />
                </Stack>
              </Paper>
            );
          })}
          {canManage && (
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <NativeSelect
                  label="Add one of your account workers"
                  value={attachId}
                  onChange={(event) => setAttachId(event.currentTarget.value)}
                  data={[
                    { value: "", label: "Select an enrolled worker" },
                    ...available.map((worker) => ({ value: worker.workerId, label: worker.name })),
                  ]}
                />
                <Text size="xs" c="dimmed">
                  First add the worker to your account in Workers. Your first organization worker becomes the primary.
                </Text>
                <Button
                  disabled={!attachId}
                  loading={busy}
                  onClick={() =>
                    void mutate(async () => {
                      await request(`${base}/workers`, {
                        method: "POST",
                        body: JSON.stringify({ workerId: attachId }),
                      });
                      setAttachId("");
                    })
                  }
                >
                  Add worker
                </Button>
              </Stack>
            </Paper>
          )}
          <Divider label="People" />
          {members.map((member) => (
            <Group key={member.user.id} justify="space-between">
              <div>
                <Text fw={500}>{member.user.name}</Text>
                <Text size="xs" c="dimmed">
                  {member.role}
                </Text>
              </div>
              <Group gap="xs">
                {selected.role === "owner" && member.role !== "owner" && (
                  <Button
                    variant="subtle"
                    size="xs"
                    disabled={busy}
                    onClick={() =>
                      void mutate(async () => {
                        let role = "admin";
                        if (member.role === "admin") role = "member";
                        await request(`${base}/members/${encodeURIComponent(member.user.id)}`, {
                          method: "PATCH",
                          body: JSON.stringify({ role }),
                        });
                      })
                    }
                  >
                    {member.role === "admin" ? "Make member" : "Make administrator"}
                  </Button>
                )}
                {member.role !== "owner" &&
                  (selected.role === "owner" ||
                    (selected.role === "admin" && member.role === "member") ||
                    member.user.id === session.user?.id) && (
                    <Button
                      color="red"
                      variant="subtle"
                      size="xs"
                      disabled={busy}
                      onClick={() =>
                        void mutate(async () => {
                          await request(`${base}/members/${encodeURIComponent(member.user.id)}`, { method: "DELETE" });
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
              </Group>
            </Group>
          ))}
          {canManage && (
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <NativeSelect
                  label="Invite a person"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.currentTarget.value)}
                  data={
                    selected.role === "owner"
                      ? [
                          { value: "member", label: "Member" },
                          { value: "admin", label: "Administrator" },
                        ]
                      : [{ value: "member", label: "Member" }]
                  }
                />
                <Button
                  loading={busy}
                  onClick={() =>
                    void mutate(async () => {
                      const result = await request<{ code: string }>(`${base}/invites`, {
                        method: "POST",
                        body: JSON.stringify({ role: inviteRole, expiresInSeconds: 86_400 }),
                      });
                      setInviteCode(result.code);
                    })
                  }
                >
                  Create one-use invitation
                </Button>
                {inviteCode && (
                  <Group>
                    <Text size="sm">Code ready. Expires in 24 hours.</Text>
                    <CopyButton value={inviteCode}>
                      {({ copied, copy }) => (
                        <Button size="xs" variant="light" onClick={copy}>
                          {copied ? "Copied" : "Copy invitation code"}
                        </Button>
                      )}
                    </CopyButton>
                  </Group>
                )}
                {invites
                  .filter(
                    (invite) => !invite.revokedAt && invite.uses < invite.maxUses && invite.expiresAt > Date.now(),
                  )
                  .map((invite) => (
                    <Group key={invite.inviteId} justify="space-between">
                      <Text size="sm">
                        {invite.role} · expires {new Date(invite.expiresAt).toLocaleString()}
                      </Text>
                      <Button
                        variant="subtle"
                        size="xs"
                        color="red"
                        disabled={busy}
                        onClick={() =>
                          void mutate(async () => {
                            await request(`${base}/invites/${encodeURIComponent(invite.inviteId)}`, {
                              method: "DELETE",
                            });
                          })
                        }
                      >
                        Revoke
                      </Button>
                    </Group>
                  ))}
              </Stack>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}

function OrganizationConnection({
  worker,
  busy,
  onSave,
}: {
  worker: OrganizationWorkerConnection;
  busy: boolean;
  onSave: (input: Pick<WorkerConnection, "mode" | "directUrl" | "relayUrl">) => Promise<void>;
}) {
  const [mode, setMode] = useState(worker.mode);
  const [directUrl, setDirectUrl] = useState(worker.directUrl ?? "");
  const [relayUrl, setRelayUrl] = useState(worker.relayUrl ?? "");
  function submit(event: FormEvent) {
    event.preventDefault();
    void onSave({ mode, directUrl: directUrl.trim() || null, relayUrl: relayUrl.trim() || null });
  }
  return (
    <details>
      <summary>My connection settings</summary>
      <form onSubmit={submit}>
        <Stack gap="sm" mt="sm">
          <NativeSelect
            label="Connection route"
            value={mode}
            onChange={(event) => {
              if (event.currentTarget.value === "direct" || event.currentTarget.value === "relay")
                setMode(event.currentTarget.value);
            }}
            data={[
              { value: "direct", label: "Direct · Tailscale or private HTTPS" },
              { value: "relay", label: "Encrypted relay" },
            ]}
          />
          {mode === "direct" && (
            <TextInput
              label="Direct worker address"
              value={directUrl}
              required
              onChange={(event) => setDirectUrl(event.currentTarget.value)}
              placeholder="https://homarr.your-tailnet.ts.net"
            />
          )}
          {mode === "relay" && (
            <TextInput
              label="Relay address"
              value={relayUrl}
              required
              onChange={(event) => setRelayUrl(event.currentTarget.value)}
              placeholder="wss://relay.example.com"
            />
          )}
          <Text size="xs" c="dimmed">
            These settings apply only to your account. Direct connections require access to the worker's network.
          </Text>
          <Button type="submit" variant="light" size="xs" loading={busy}>
            Save my connection
          </Button>
        </Stack>
      </form>
    </details>
  );
}
