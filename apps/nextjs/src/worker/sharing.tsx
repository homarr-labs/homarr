"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CopyButton,
  Group,
  NativeSelect,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import type { SavedWorker, WorkerConnection } from "@homarr/worker-client";
import { shareLink, workerRequest } from "@homarr/worker-client";
import { clientApi } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";

import { errorMessage } from "./platform";

interface AccessRecord {
  id: string;
  role: string;
  boardIds: string[];
  expiresAt: number | null;
  revoked?: boolean;
  used?: boolean;
  subject?: string;
  anonymous?: boolean;
}
interface IssuedAccess {
  id: string;
  token: string;
  expiresAt: number | null;
}
const expiryLabel = (value: number | null) => (value ? new Date(value).toLocaleString() : "Until revoked");

export function WorkerSharing({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [kind, setKind] = useState("share");
  const [role, setRole] = useState("viewer");
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const api = useMemo(() => clientApi.createClient({ links: [createWorkerLink(connection)] }), [connection]);
  const [duration, setDuration] = useState("86400");
  const [anonymous, setAnonymous] = useState(true);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [records, setRecords] = useState<{ type: "grants" | "shares" | "invitations"; entries: AccessRecord[] }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [boardResult, grants, shares, invitations, localUsers] = await Promise.all([
      workerRequest<{ boards: { id: string; name: string }[] }>(connection, "/remote/boards"),
      workerRequest<{ grants: AccessRecord[] }>(connection, "/remote/access/grants"),
      workerRequest<{ shares: AccessRecord[] }>(connection, "/remote/access/shares"),
      workerRequest<{ invitations: AccessRecord[] }>(connection, "/remote/access/invitations"),
      api.user.getAll.query(),
    ]);
    setBoards(boardResult.boards);
    setUsers(localUsers.filter((user) => !user.id.startsWith("worker:") && !user.id.startsWith("worker-")));
    setRecords([
      { type: "shares", entries: shares.shares },
      { type: "invitations", entries: invitations.invitations },
      { type: "grants", entries: grants.grants.filter((entry) => entry.subject !== "bearer") },
    ]);
  }, [connection, api]);
  useEffect(() => {
    if (worker.grant.role === "owner") void load().catch((cause) => setError(errorMessage(cause)));
  }, [load, worker.grant.role]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setLink("");
    try {
      if ((kind === "share" || role === "viewer") && !boardIds.length) throw new Error("Choose a board to share.");
      if (kind === "invite" && role === "user" && !userId) throw new Error("Choose an existing Homarr user.");
      let expiresAt: number | null = null;
      if (duration !== "permanent") expiresAt = Date.now() + Number(duration) * 1_000;
      const type = kind === "share" ? "shares" : "invitations";
      const result = await workerRequest<{ share?: IssuedAccess; invitation?: IssuedAccess }>(
        connection,
        `/remote/access/${type}`,
        {
          method: "POST",
          body: JSON.stringify({
            role: kind === "share" ? "viewer" : role,
            boardIds,
            expiresAt,
            anonymous,
            label,
            ...(kind === "invite" && role === "user" ? { userId } : {}),
          }),
        },
      );
      const issued = result.share ?? result.invitation;
      if (!issued) throw new Error("This worker did not return an access link.");
      setLink(
        shareLink(
          worker,
          issued.token,
          kind === "share" ? "share" : "invite",
          label || worker.name,
          window.location.origin,
        ),
      );
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(type: string, id: string) {
    setBusy(true);
    setError("");
    try {
      await workerRequest(connection, `/remote/access/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  if (worker.grant.role !== "owner") return <Text c="dimmed">A worker owner manages sharing and device access.</Text>;
  return (
    <Stack>
      <form onSubmit={(event) => void create(event)}>
        <Stack>
          <Title order={4}>Share your boards</Title>
          <Text c="dimmed" size="sm">
            Links give access only to the boards you choose. You can revoke them here.
          </Text>
          <NativeSelect
            label="Access"
            value={kind}
            onChange={(event) => {
              setKind(event.currentTarget.value);
              if (event.currentTarget.value === "invite" && duration === "permanent") setDuration("86400");
            }}
            data={[
              { value: "share", label: "Board link" },
              { value: "invite", label: "Device invitation" },
            ]}
          />
          <TextInput
            label="Label"
            value={label}
            maxLength={100}
            onChange={(event) => setLabel(event.currentTarget.value)}
          />
          {kind === "invite" && (
            <NativeSelect
              label="Role"
              value={role}
              onChange={(event) => setRole(event.currentTarget.value)}
              data={[
                { value: "viewer", label: "View selected boards" },
                { value: "user", label: "Existing Homarr user" },
                { value: "owner", label: "Manage this worker" },
              ]}
            />
          )}
          {kind === "invite" && role === "user" && (
            <NativeSelect
              label="Homarr user"
              value={userId}
              onChange={(event) => setUserId(event.currentTarget.value)}
              required
              data={[
                { value: "", label: "Choose a user" },
                ...users.map((user) => ({ value: user.id, label: user.name || user.email || user.id })),
              ]}
              description="This device keeps the user's existing board, group, and integration permissions."
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
          {boards.map((board) => (
            <Checkbox
              key={board.id}
              label={board.name}
              checked={boardIds.includes(board.id)}
              disabled={kind === "invite" && role !== "viewer"}
              onChange={(event) => {
                if (event.currentTarget.checked) setBoardIds((ids) => [...ids, board.id]);
                else setBoardIds((ids) => ids.filter((id) => id !== board.id));
              }}
            />
          ))}
          {kind === "share" && (
            <Checkbox
              checked={anonymous}
              onChange={(event) => setAnonymous(event.currentTarget.checked)}
              label="Anyone with this link can open it"
              description="Turn off to require a device already approved by this worker."
            />
          )}
          {kind === "invite" && role === "owner" && (
            <Alert color="yellow">An owner can change integrations, boards, and other devices on this worker.</Alert>
          )}
          <Group>
            <Button type="submit" loading={busy}>
              Create private link
            </Button>
          </Group>
        </Stack>
      </form>
      {link && (
        <Paper withBorder p="md">
          <Stack>
            <Text size="sm">Private access link</Text>
            <Text size="xs" style={{ overflowWrap: "anywhere" }} data-private="true">
              {link}
            </Text>
            <CopyButton value={link}>
              {({ copied, copy }) => (
                <Button variant="light" onClick={copy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              )}
            </CopyButton>
          </Stack>
        </Paper>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {records.map(({ type, entries }) => (
        <Paper key={type} withBorder p="md">
          <Stack gap="sm">
            <Title order={5}>{type === "grants" ? "Approved devices" : type}</Title>
            {entries
              .filter((entry) => !entry.revoked && !entry.used && (!entry.expiresAt || entry.expiresAt > Date.now()))
              .map((entry) => (
                <Group key={entry.id} justify="space-between">
                  <div>
                    <Text size="sm">
                      {entry.role} · {entry.id.slice(0, 10)}
                      {entry.id === worker.grant.id && " · this browser"}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {expiryLabel(entry.expiresAt)}
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    disabled={busy || entry.id === worker.grant.id}
                    onClick={() => void revoke(type, entry.id)}
                  >
                    Revoke
                  </Button>
                </Group>
              ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
