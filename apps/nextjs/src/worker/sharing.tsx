"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Group, MultiSelect, NativeSelect, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconLink, IconPlus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";
import type { SavedWorker, WorkerConnection, WorkerGrant } from "@homarr/worker-client";
import { shareLink, workerRequest } from "@homarr/worker-client";

import { errorMessage } from "./platform";
import { InlineConfirmation, InlinePanel, WorkerCopyButton, WorkerCopyField, workerConnectionKey } from "./ui";
import classes from "./worker-settings.module.css";

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
  entries: AccessRecord[];
}

function expiryLabel(value: number | null) {
  if (value) return `Expires ${new Date(value).toLocaleString()}`;
  return "Until revoked";
}

export function WorkerSharing({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const grant = (connection.authorization as { grant?: WorkerGrant }).grant;
  if (grant?.role !== "owner")
    return (
      <Text size="sm" c="dimmed">
        A worker owner manages board links and device access.
      </Text>
    );
  return (
    <SharingConsole
      key={`${worker.workerId}:${workerConnectionKey(connection)}:${grant.id}`}
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
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [kind, setKind] = useState<"share" | "invite" | null>(null);
  const [role, setRole] = useState("viewer");
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [duration, setDuration] = useState("86400");
  const [anonymous, setAnonymous] = useState(true);
  const [link, setLink] = useState("");
  const [issuedExpiry, setIssuedExpiry] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState<{ type: AccessType; entry: AccessRecord } | null>(null);
  const alive = useRef(false);
  const loadId = useRef(0);
  const api = useMemo(() => clientApi.createClient({ link: createWorkerLink(connection) }), [connection]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const id = ++loadId.current;
      const [boardResult, grants, shares, invitations, localUsers] = await Promise.all([
        workerRequest<{ boards: { id: string; name: string }[] }>(connection, "/remote/boards", { signal }),
        workerRequest<{ grants: AccessRecord[] }>(connection, "/remote/access/grants", { signal }),
        workerRequest<{ shares: AccessRecord[] }>(connection, "/remote/access/shares", { signal }),
        workerRequest<{ invitations: AccessRecord[] }>(connection, "/remote/access/invitations", { signal }),
        api.user.getAll.query(undefined, { signal }),
      ]);
      if (!alive.current || id !== loadId.current || signal?.aborted) return;
      setBoards(boardResult.boards);
      setUsers(localUsers.filter((user) => !user.id.startsWith("worker:") && !user.id.startsWith("worker-")));
      setRecords([
        { type: "shares", entries: shares.shares },
        { type: "invitations", entries: invitations.invitations },
        { type: "grants", entries: grants.grants.filter((entry) => entry.subject !== "bearer") },
      ]);
    },
    [connection, api],
  );

  useEffect(() => {
    const controller = new AbortController();
    alive.current = true;
    void load(controller.signal)
      .catch((cause) => {
        if (alive.current && !controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (alive.current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await load();
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }

  function open(nextKind: "share" | "invite") {
    setKind(nextKind);
    setRole("viewer");
    setBoardIds([]);
    if (boards.length === 1 && boards[0]) setBoardIds([boards[0].id]);
    setUserId("");
    setDuration("86400");
    setAnonymous(true);
    setLink("");
    setFormError("");
    setNotice("");
    setConfirmation(null);
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
      const input: { role: string; boardIds: string[]; expiresAt: number | null; anonymous: boolean; userId?: string } =
        {
          role: issuedRole,
          boardIds: [],
          expiresAt,
          anonymous,
        };
      if (needsBoards) input.boardIds = boardIds;
      if (kind === "invite" && role === "user") input.userId = userId;
      const result = await workerRequest<{ share?: IssuedAccess; invitation?: IssuedAccess }>(
        connection,
        `/remote/access/${type}`,
        { method: "POST", body: JSON.stringify(input) },
      );
      if (!alive.current) return;
      const issued = result.share ?? result.invitation;
      if (!issued) throw new Error("The worker did not return a link. Refresh before trying again.");
      setLink(shareLink(worker, issued.token, kind, worker.name, window.location.origin));
      setIssuedExpiry(issued.expiresAt);
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
    setNotice("");
    try {
      await workerRequest(connection, `/remote/access/${type}/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      if (!alive.current) return;
      setConfirmation(null);
      setLink("");
      setKind(null);
      setNotice("Access revoked.");
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

  function activeEntries(type: AccessType) {
    return (records.find((group) => group.type === type)?.entries ?? []).filter(
      (entry) => !entry.revoked && !entry.used && (!entry.expiresAt || entry.expiresAt > Date.now()),
    );
  }

  function accessRows(type: AccessType) {
    const entries = activeEntries(type);
    if (!entries.length) {
      let message = "No approved devices.";
      if (type === "shares") message = "No board links yet. Create a link to share a board.";
      if (type === "invitations") message = "No pending device invitations.";
      return (
        <Text size="sm" c="dimmed" className={classes.emptyState}>
          {message}
        </Text>
      );
    }
    return (
      <ul className={classes.list}>
        {entries.map((entry) => {
          let accessLabel = entry.role;
          if (type === "shares") {
            accessLabel = "Approved devices only";
            if (entry.anonymous) accessLabel = "Anyone with the link";
          }
          const protectedAccess =
            protectedGrants.has(entry.id) || (type === "invitations" && protectedInvitations.has(entry.id));
          const confirming = confirmation?.type === type && confirmation.entry.id === entry.id;
          return (
            <li key={entry.id} className={classes.listRow}>
              <div className={classes.rowContent}>
                <div className={classes.rowInfo}>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {scope(entry)}
                    </Text>
                    {entry.id === worker.grant.id && (
                      <Badge size="xs" variant="light">
                        This browser
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed" mt={2}>
                    {accessLabel} · {expiryLabel(entry.expiresAt)}
                  </Text>
                  {protectedAccess && entry.id !== worker.grant.id && (
                    <Text size="xs" c="dimmed" mt={2}>
                      Required by this browser’s owner access
                    </Text>
                  )}
                </div>
                <div className={classes.rowActions}>
                  {type === "shares" && (
                    <WorkerCopyButton
                      disabled={busy || refreshing}
                      label="Copy link"
                      loadValue={async (signal) => {
                        const result = await workerRequest<{ share: IssuedAccess }>(
                          connection,
                          `/remote/access/shares/${encodeURIComponent(entry.id)}`,
                          { signal },
                        );
                        return shareLink(worker, result.share.token, "share", worker.name, window.location.origin);
                      }}
                    />
                  )}
                  <Button
                    variant="subtle"
                    size="sm"
                    color="red"
                    disabled={busy || protectedAccess}
                    aria-label={`Revoke ${accessLabel} ${entry.id.slice(0, 10)}`}
                    aria-expanded={confirming}
                    onClick={() => {
                      setError("");
                      setConfirmation({ type, entry });
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
              {confirming && (
                <div className={classes.rowDetails}>
                  <InlineConfirmation
                    title="Revoke this access?"
                    description="This access stops working immediately. A new link or invitation will be needed to restore it."
                    action="Revoke access"
                    busy={busy}
                    onCancel={() => {
                      setConfirmation(null);
                      setError("");
                    }}
                    onConfirm={() => void revoke()}
                    error={error}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  let formTitle = "Create a board link";
  let createLabel = "Create link";
  if (kind === "invite") {
    formTitle = "Invite a device";
    createLabel = "Create invitation";
  }
  const needsBoards = kind === "share" || role === "viewer";

  const createForm = (
    <InlinePanel title={formTitle}>
      {link && (
        <Stack gap="md">
          <div>
            <Text fw={500} size="sm">
              Link ready
            </Text>
            <Text size="sm" c="dimmed">
              {expiryLabel(issuedExpiry)}. {kind === "invite" && "Copy this single-use invitation before closing."}
            </Text>
          </div>
          <WorkerCopyField label="Private link" value={link} />
          <Group>
            <Button variant="default" size="sm" onClick={close}>
              Done
            </Button>
          </Group>
        </Stack>
      )}
      {!link && (
        <form onSubmit={(event) => void create(event)}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Stack gap="md" className={classes.formFields}>
              {kind === "invite" && (
                <NativeSelect
                  label="Device access"
                  value={role}
                  onChange={(event) => setRole(event.currentTarget.value)}
                  data={[
                    { value: "viewer", label: "View selected boards" },
                    { value: "user", label: "Use an existing user’s permissions" },
                    { value: "owner", label: "Full worker access" },
                  ]}
                  description="The invitation can be used once. Device access ends at its expiry."
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
                  description="Uses their existing board, group and integration permissions."
                />
              )}
              {needsBoards && (
                <MultiSelect
                  label="Boards"
                  placeholder="Choose boards to share"
                  value={boardIds}
                  onChange={setBoardIds}
                  data={boards.map((board) => ({ value: board.id, label: board.name }))}
                  searchable
                  nothingFoundMessage="No matching boards"
                  classNames={{ dropdown: classes.dropdown }}
                  required
                  disabled={busy || !boards.length}
                  maxDropdownHeight={240}
                />
              )}
              {needsBoards && !boards.length && (
                <Text size="sm" c="dimmed">
                  Create a board before sharing it.
                </Text>
              )}
              <div className={classes.fieldGrid}>
                {kind === "share" && (
                  <NativeSelect
                    label="Who can open it"
                    value={String(anonymous)}
                    onChange={(event) => setAnonymous(event.currentTarget.value === "true")}
                    data={[
                      { value: "true", label: "Anyone with the link" },
                      { value: "false", label: "Approved devices only" },
                    ]}
                  />
                )}
                <NativeSelect
                  label="Expires after"
                  value={duration}
                  onChange={(event) => setDuration(event.currentTarget.value)}
                  data={[
                    { value: "3600", label: "1 hour" },
                    { value: "86400", label: "24 hours" },
                    { value: "604800", label: "7 days" },
                    ...(kind === "share" ? [{ value: "permanent", label: "Until revoked" }] : []),
                  ]}
                />
              </div>
              {kind === "share" && anonymous && (
                <Text size="sm" c="dimmed">
                  Anyone with this link can view the selected boards. Share it only with people you trust.
                </Text>
              )}
              {kind === "share" && !anonymous && (
                <Text size="sm" c="dimmed">
                  Only devices already approved for these boards can use this link.
                </Text>
              )}
              {kind === "invite" && role === "owner" && (
                <Alert color="yellow">This device can manage boards, integrations, users and access.</Alert>
              )}
              {worker.grant.expiresAt && (
                <Text size="xs" c="dimmed">
                  Access also ends when this browser’s owner access expires on{" "}
                  {new Date(worker.grant.expiresAt).toLocaleString()}.
                </Text>
              )}
              {formError && (
                <Text size="sm" c="red" role="alert">
                  {formError}
                </Text>
              )}
              <Group gap="sm">
                <Button type="submit" size="sm" loading={busy} disabled={needsBoards && !boardIds.length}>
                  {createLabel}
                </Button>
                <Button variant="default" size="sm" onClick={close} disabled={busy}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          </fieldset>
        </form>
      )}
    </InlinePanel>
  );

  return (
    <Stack gap="xl">
      <section>
        <Stack gap="lg">
          <div className={classes.sectionHeader}>
            <div>
              <Title order={3} className={classes.sectionHeading}>
                Board links
              </Title>
              <Text size="sm" c="dimmed">
                Share selected boards with a link you can revoke.
              </Text>
            </div>
            <Group gap="xs">
              <Button
                variant="subtle"
                size="sm"
                loading={refreshing}
                onClick={() => void refresh()}
                disabled={busy || loading}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                leftSection={<IconLink size={16} />}
                onClick={() => open("share")}
                disabled={loading || busy || !boards.length}
                aria-expanded={kind === "share"}
              >
                Create link
              </Button>
            </Group>
          </div>
          {error && !confirmation && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {notice && (
            <Text component="output" size="sm" c="green">
              {notice}
            </Text>
          )}
          {kind === "share" && createForm}
          {loading && (
            <Stack gap="sm" aria-label="Loading board links" aria-busy="true">
              <Skeleton height={64} />
              <Skeleton height={64} />
            </Stack>
          )}
          {!loading && accessRows("shares")}
        </Stack>
      </section>
      {!loading && (
        <details className={classes.details}>
          <summary>Device access</summary>
          <Stack gap="xl" className={classes.detailsContent}>
            <section>
              <Stack gap="md">
                <div className={classes.sectionHeader}>
                  <div>
                    <Title order={4} className={classes.sectionHeading}>
                      Device invitations
                    </Title>
                    <Text size="sm" c="dimmed">
                      Give another browser its own access to this worker.
                    </Text>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => open("invite")}
                    disabled={busy}
                    aria-expanded={kind === "invite"}
                  >
                    Invite device
                  </Button>
                </div>
                {kind === "invite" && createForm}
                {accessRows("invitations")}
              </Stack>
            </section>
            <section>
              <Stack gap="md">
                <Title order={4}>Approved devices</Title>
                {accessRows("grants")}
              </Stack>
            </section>
          </Stack>
        </details>
      )}
    </Stack>
  );
}
