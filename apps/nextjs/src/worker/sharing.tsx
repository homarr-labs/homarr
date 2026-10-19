"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  CopyButton,
  Group,
  Modal,
  NativeSelect,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck, IconCopy, IconLink, IconPlus } from "@tabler/icons-react";

import type { SavedWorker, WorkerConnection, WorkerGrant } from "@homarr/worker-client";
import { shareLink, workerRequest } from "@homarr/worker-client";
import { clientApi } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";

import { errorMessage } from "./platform";

type AccessType = "shares" | "invitations" | "grants";
interface AccessRecord {
  id: string;
  role: string;
  boardIds: string[];
  expiresAt: number | null;
  revoked?: boolean;
  used?: boolean;
  subject?: string;
  anonymous?: boolean;
  userId?: string;
  parentId?: string;
  parentGrantId?: string;
}
interface IssuedAccess {
  id: string;
  token: string;
  expiresAt: number | null;
}
interface AccessGroup {
  type: AccessType;
  title: string;
  empty: string;
  entries: AccessRecord[];
}
const connectionKeys = new WeakMap<WorkerConnection, number>();
let nextConnectionKey = 0;

function expiryLabel(value: number | null) {
  if (value) return new Date(value).toLocaleString();
  return "Until revoked";
}

export function WorkerSharing({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  let key = connectionKeys.get(connection);
  if (key === undefined) {
    key = ++nextConnectionKey;
    connectionKeys.set(connection, key);
  }
  const grant = (connection.authorization as { grant?: WorkerGrant }).grant;
  if (grant?.role !== "owner") return <Text c="dimmed">An owner manages board links and device access.</Text>;
  return (
    <SharingConsole
      key={`${worker.workerId}:${key}:${grant.id}`}
      worker={{ ...worker, grant }}
      connection={connection}
    />
  );
}

function SharingConsole({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [records, setRecords] = useState<AccessGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [kind, setKind] = useState<"share" | "invite" | null>(null);
  const [role, setRole] = useState("viewer");
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [duration, setDuration] = useState("86400");
  const [anonymous, setAnonymous] = useState(true);
  const [link, setLink] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState<{ type: AccessType; entry: AccessRecord } | null>(null);
  const alive = useRef(false);
  const loadId = useRef(0);
  const api = useMemo(() => clientApi.createClient({ link: createWorkerLink(connection) }), [connection]);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    const [boardResult, grants, shares, invitations, localUsers] = await Promise.all([
      workerRequest<{ boards: { id: string; name: string }[] }>(connection, "/remote/boards"),
      workerRequest<{ grants: AccessRecord[] }>(connection, "/remote/access/grants"),
      workerRequest<{ shares: AccessRecord[] }>(connection, "/remote/access/shares"),
      workerRequest<{ invitations: AccessRecord[] }>(connection, "/remote/access/invitations"),
      api.user.getAll.query(),
    ]);
    if (!alive.current || id !== loadId.current) return;
    setBoards(boardResult.boards);
    setUsers(localUsers.filter((user) => !user.id.startsWith("worker:") && !user.id.startsWith("worker-")));
    setRecords([
      {
        type: "shares",
        title: "Board links",
        empty: "No active board links. Create one to share selected boards.",
        entries: shares.shares,
      },
      {
        type: "invitations",
        title: "Pending device invitations",
        empty: "No pending invitations. Invite a device to grant persistent access.",
        entries: invitations.invitations,
      },
      {
        type: "grants",
        title: "Approved devices",
        empty: "No approved devices.",
        entries: grants.grants.filter((entry) => entry.subject !== "bearer"),
      },
    ]);
  }, [connection, api]);

  useEffect(() => {
    alive.current = true;
    void load()
      .catch((cause) => {
        if (alive.current) setError(errorMessage(cause));
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
    };
  }, [load]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      await load();
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  function open(nextKind: "share" | "invite") {
    setKind(nextKind);
    setRole("viewer");
    setBoardIds([]);
    setUserId("");
    setDuration("86400");
    setAnonymous(true);
    setLink("");
    setFormError("");
    setSuccess("");
  }
  function close() {
    if (busy) return;
    setKind(null);
    setLink("");
    setFormError("");
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!kind || busy) return;
    setBusy(true);
    setFormError("");
    try {
      const needsBoards = kind === "share" || role === "viewer";
      if (needsBoards && !boardIds.length) throw new Error("Choose at least one board.");
      if (kind === "invite" && role === "user" && !userId) throw new Error("Choose an existing user.");
      let expiresAt: number | null = null;
      if (duration !== "permanent") expiresAt = Date.now() + Number(duration) * 1_000;
      let type = "shares";
      let issuedRole = "viewer";
      if (kind === "invite") {
        type = "invitations";
        issuedRole = role;
      }
      const result = await workerRequest<{ share?: IssuedAccess; invitation?: IssuedAccess }>(
        connection,
        `/remote/access/${type}`,
        {
          method: "POST",
          body: JSON.stringify({
            role: issuedRole,
            boardIds: needsBoards ? boardIds : [],
            expiresAt,
            anonymous,
            ...(kind === "invite" && role === "user" ? { userId } : {}),
          }),
        },
      );
      if (!alive.current) return;
      const issued = result.share ?? result.invitation;
      if (!issued) throw new Error("The worker did not return a link. Refresh before trying again.");
      setLink(shareLink(worker, issued.token, kind, worker.name, window.location.origin));
      try {
        await load();
      } catch (cause) {
        if (alive.current) setError(`Link created. Could not refresh access: ${errorMessage(cause)}`);
      }
    } catch (cause) {
      if (alive.current) setFormError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function revoke() {
    if (!confirmation || busy) return;
    const { type, entry } = confirmation;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await workerRequest(connection, `/remote/access/${type}/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      if (!alive.current) return;
      setConfirmation(null);
      setSuccess("Access revoked.");
      setRecords((groups) =>
        groups.map((group) => {
          if (group.type !== type) return group;
          return { ...group, entries: group.entries.filter((record) => record.id !== entry.id) };
        }),
      );
      try {
        await load();
      } catch (cause) {
        if (alive.current) setError(`Access revoked. Could not refresh the list: ${errorMessage(cause)}`);
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const protectedGrants = new Set([worker.grant.id]);
  const protectedInvitations = new Set<string>();
  const grants = records.find((group) => group.type === "grants")?.entries ?? [];
  let authority = grants.find((entry) => entry.id === worker.grant.id);
  while (authority) {
    if (authority.parentId) protectedInvitations.add(authority.parentId);
    if (!authority.parentGrantId || protectedGrants.has(authority.parentGrantId)) break;
    protectedGrants.add(authority.parentGrantId);
    authority = grants.find((entry) => entry.id === authority?.parentGrantId);
  }
  function scope(entry: AccessRecord) {
    if (entry.role === "owner") return "Full worker access";
    if (entry.role === "user") {
      const user = users.find((item) => item.id === entry.userId);
      return user?.name || user?.email || "Existing user permissions";
    }
    if (entry.role === "service") return "Service permissions";
    return entry.boardIds.map((id) => boards.find((board) => board.id === id)?.name ?? id).join(", ");
  }
  let modalTitle = "Create board link";
  let createLabel = "Create link";
  if (kind === "invite") {
    modalTitle = "Invite a device";
    createLabel = "Create invitation";
  }
  let copyLabel = "Copy link";
  if (kind === "invite") copyLabel = "Copy invitation";
  const needsBoards = kind === "share" || role === "viewer";

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Sharing</Title>
          <Text size="sm" c="dimmed">
            Board links and approved devices.
          </Text>
        </div>
        <Group gap="xs">
          <Button variant="default" size="sm" onClick={() => void refresh()} disabled={busy || loading}>
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => open("invite")}
            disabled={loading || busy}
          >
            Invite device
          </Button>
          <Button
            size="sm"
            leftSection={<IconLink size={16} />}
            onClick={() => open("share")}
            disabled={loading || busy}
          >
            Create board link
          </Button>
        </Group>
      </Group>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {success && (
        <Text component="output" size="sm" c="green">
          {success}
        </Text>
      )}
      {loading && (
        <Stack gap="sm" aria-label="Loading access">
          <Skeleton height={32} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </Stack>
      )}
      {!loading &&
        records.map(({ type, title, empty, entries }) => {
          const active = entries.filter(
            (entry) => !entry.revoked && !entry.used && (!entry.expiresAt || entry.expiresAt > Date.now()),
          );
          return (
            <Stack key={type} gap="sm">
              <Group gap="xs">
                <Title order={4}>{title}</Title>
                <Text size="sm" c="dimmed">
                  {active.length}
                </Text>
              </Group>
              {!active.length && (
                <Text size="sm" c="dimmed">
                  {empty}
                </Text>
              )}
              {!!active.length && (
                <Table.ScrollContainer minWidth={560}>
                  <Table verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Access</Table.Th>
                        <Table.Th>Scope</Table.Th>
                        <Table.Th>Expires</Table.Th>
                        <Table.Th>
                          <Text component="span" size="sm">
                            Actions
                          </Text>
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {active.map((entry) => {
                        let accessLabel = entry.role;
                        if (type === "shares") {
                          accessLabel = "Approved devices";
                          if (entry.anonymous) accessLabel = "Anyone with the link";
                        }
                        const protectedAccess =
                          protectedGrants.has(entry.id) ||
                          (type === "invitations" && protectedInvitations.has(entry.id));
                        return (
                          <Table.Tr key={entry.id}>
                            <Table.Td>
                              <Group gap="xs">
                                <Text size="sm">{accessLabel}</Text>
                                {entry.id === worker.grant.id && (
                                  <Badge variant="light" size="xs">
                                    This browser
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed">
                                {entry.id.slice(0, 10)}
                              </Text>
                            </Table.Td>
                            <Table.Td maw={300}>
                              <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                                {scope(entry)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{expiryLabel(entry.expiresAt)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                variant="subtle"
                                size="xs"
                                color="red"
                                disabled={busy || protectedAccess}
                                title={protectedAccess ? "Required by this browser's owner access" : undefined}
                                aria-label={`Revoke ${accessLabel} ${entry.id.slice(0, 10)}`}
                                onClick={() => setConfirmation({ type, entry })}
                              >
                                Revoke
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Stack>
          );
        })}
      <Modal
        opened={kind !== null}
        onClose={close}
        title={modalTitle}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        {link && (
          <Stack gap="md">
            <Alert color="green" title="Link ready">
              Copy it now. The private link is only shown once.
            </Alert>
            <TextInput
              label="Private link"
              value={link}
              readOnly
              data-private="true"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Done
              </Button>
              <CopyButton value={link}>
                {({ copied, copy }) => {
                  let label = copyLabel;
                  let icon = <IconCopy size={16} />;
                  if (copied) {
                    label = "Copied";
                    icon = <IconCheck size={16} />;
                  }
                  return (
                    <Button onClick={copy} leftSection={icon}>
                      {label}
                    </Button>
                  );
                }}
              </CopyButton>
            </Group>
          </Stack>
        )}
        {!link && (
          <form onSubmit={(event) => void create(event)}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <Stack gap="md">
                {kind === "share" && (
                  <NativeSelect
                    label="Who can open this link?"
                    value={String(anonymous)}
                    onChange={(event) => setAnonymous(event.currentTarget.value === "true")}
                    data={[
                      { value: "true", label: "Anyone with the link" },
                      { value: "false", label: "Approved devices only" },
                    ]}
                  />
                )}
                {kind === "invite" && (
                  <NativeSelect
                    label="Device permissions"
                    value={role}
                    onChange={(event) => setRole(event.currentTarget.value)}
                    data={[
                      { value: "viewer", label: "View selected boards" },
                      { value: "user", label: "Use an existing user's permissions" },
                      { value: "owner", label: "Full worker access" },
                    ]}
                    description="Invitations are single-use. Device access expires at the selected time."
                  />
                )}
                {kind === "invite" && role === "user" && (
                  <NativeSelect
                    label="User"
                    value={userId}
                    onChange={(event) => setUserId(event.currentTarget.value)}
                    required
                    data={[
                      { value: "", label: "Choose a user" },
                      ...users.map((user) => ({ value: user.id, label: user.name || user.email || user.id })),
                    ]}
                    description="Uses their existing board, group, and integration permissions."
                  />
                )}
                {needsBoards && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Boards
                    </Text>
                    {!boards.length && (
                      <Text size="sm" c="dimmed">
                        Create a board before sharing it.
                      </Text>
                    )}
                    {boards.map((board) => (
                      <Checkbox
                        key={board.id}
                        label={board.name}
                        checked={boardIds.includes(board.id)}
                        onChange={(event) => {
                          if (event.currentTarget.checked) setBoardIds((ids) => [...ids, board.id]);
                          else setBoardIds((ids) => ids.filter((id) => id !== board.id));
                        }}
                      />
                    ))}
                  </Stack>
                )}
                <NativeSelect
                  label={kind === "invite" ? "Invitation expires after" : "Link expires after"}
                  value={duration}
                  onChange={(event) => setDuration(event.currentTarget.value)}
                  data={[
                    { value: "3600", label: "1 hour" },
                    { value: "86400", label: "24 hours" },
                    { value: "604800", label: "7 days" },
                    ...(kind === "share" ? [{ value: "permanent", label: "Until revoked" }] : []),
                  ]}
                />
                {kind === "invite" && role === "owner" && (
                  <Alert color="yellow">This device can manage boards, integrations, users, and access.</Alert>
                )}
                {formError && (
                  <Alert color="red" role="alert">
                    {formError}
                  </Alert>
                )}
                <Group justify="flex-end">
                  <Button variant="default" onClick={close} disabled={busy}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={busy} disabled={needsBoards && !boards.length}>
                    {createLabel}
                  </Button>
                </Group>
              </Stack>
            </fieldset>
          </form>
        )}
      </Modal>
      <Modal
        opened={confirmation !== null}
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
        title="Revoke access?"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          <Text size="sm">
            This access stops working immediately. A new link or invitation will be needed to restore it.
          </Text>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmation(null)} disabled={busy}>
              Cancel
            </Button>
            <Button color="red" loading={busy} onClick={() => void revoke()}>
              Revoke access
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
