import { Alert, Button, Checkbox, CopyButton, NativeSelect, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import type { PlatformSession, WorkerConnection as DirectoryWorker } from "@homarr/remote-platform/types";
import type { SavedWorker, WorkerConnection } from "../lib/connection";
import { shareLink, workerRequest } from "../lib/connection";
import { errorMessage, expiryLabel, platformRequest } from "../lib/platform";
import type { BoardSummary } from "./board-view";
import { DirectoryAccess } from "./account-panel";
import { Glyph } from "./icons";

interface GrantRecord {
  id: string;
  role: string;
  subject?: string;
  deviceId?: string;
  boardIds: string[];
  expiresAt: number | null;
  revokedAt?: number | null;
  revoked?: boolean;
  used?: boolean;
  anonymous?: boolean;
}
interface IssuedAccess {
  id: string;
  token: string;
  expiresAt: number | null;
}

function shareAudience(share: GrantRecord): string {
  if (share.anonymous === false) return "Worker members only";
  return "Anyone with this link";
}

export function WorkerAccess({
  worker,
  connection,
  boards,
  session,
  directoryWorker,
}: {
  worker: SavedWorker;
  connection: WorkerConnection;
  boards: BoardSummary[];
  session: PlatformSession;
  directoryWorker?: DirectoryWorker;
}) {
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [duration, setDuration] = useState("86400");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("share");
  const [anonymous, setAnonymous] = useState(true);
  const [role, setRole] = useState("viewer");
  const [link, setLink] = useState("");
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [shares, setShares] = useState<GrantRecord[]>([]);
  const [invitations, setInvitations] = useState<GrantRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const owner = worker.grant.role === "owner";
  const load = useCallback(async () => {
    const [grantResult, shareResult, inviteResult] = await Promise.all([
      workerRequest<{ grants: GrantRecord[] }>(connection, "/remote/access/grants"),
      workerRequest<{ shares: GrantRecord[] }>(connection, "/remote/access/shares"),
      workerRequest<{ invitations: GrantRecord[] }>(connection, "/remote/access/invitations"),
    ]);
    setGrants(grantResult.grants.filter((grant) => !grant.revoked && grant.subject !== "bearer"));
    setShares(
      shareResult.shares.filter((share) => !share.revoked && (!share.expiresAt || share.expiresAt > Date.now())),
    );
    setInvitations(
      inviteResult.invitations.filter(
        (invite) => !invite.revoked && !invite.used && (!invite.expiresAt || invite.expiresAt > Date.now()),
      ),
    );
  }, [connection]);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    void load().catch((cause) => {
      if (active) setError(errorMessage(cause));
    });
    return () => {
      active = false;
    };
  }, [load, owner]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setLink("");
    try {
      let expiresAt: number | null = null;
      if (duration !== "permanent") expiresAt = Date.now() + Number(duration) * 1000;
      if ((kind === "share" || role === "viewer") && !boardIds.length)
        throw new Error("Select at least one board to share.");
      const path = `/remote/access/${kind === "share" ? "shares" : "invitations"}`;
      const response = await workerRequest<{ share?: IssuedAccess; invitation?: IssuedAccess }>(connection, path, {
        method: "POST",
        body: JSON.stringify({ role, boardIds, expiresAt, anonymous, label: label.trim() }),
      });
      const issued = response.share ?? response.invitation;
      if (!issued) throw new Error("The worker returned an invalid access link.");
      setLink(shareLink(worker, issued.token, kind === "share" ? "share" : "invite", label.trim() || worker.name));
      await load();
      if (kind === "share" && session.user && directoryWorker) {
        try {
          await platformRequest(`/api/workers/${encodeURIComponent(worker.workerId)}/shares`, session, {
            method: "POST",
            body: JSON.stringify({
              grantId: issued.id,
              label: label.trim() || "Shared board",
              expiresAt,
              anonymous,
            }),
          });
        } catch {
          setError(
            "Your private link was created. Its directory label could not be saved; you can still use or revoke the link here.",
          );
        }
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(type: "grants" | "shares" | "invitations", id: string) {
    setBusy(true);
    setError("");
    try {
      await workerRequest(connection, `/remote/access/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
      if (type === "shares" && session.user && directoryWorker) {
        try {
          const result = await platformRequest<{ shares: { shareId: string; grantId: string }[] }>(
            `/api/workers/${encodeURIComponent(worker.workerId)}/shares`,
            session,
          );
          await Promise.all(
            result.shares
              .filter((share) => share.grantId === id)
              .map((share) =>
                platformRequest(
                  `/api/workers/${encodeURIComponent(worker.workerId)}/shares/${encodeURIComponent(share.shareId)}`,
                  session,
                  { method: "DELETE" },
                ),
              ),
          );
        } catch {
          setError("Worker access was revoked. Its account directory label could not be updated.");
        }
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  if (!owner)
    return (
      <Paper className="panel" withBorder>
        <Title order={3}>Viewer access</Title>
        <Text c="dimmed" size="sm" mt="sm">
          This device can read the boards shared with it. An owner manages invitations, sharing links, and other
          devices.
        </Text>
      </Paper>
    );
  return (
    <Stack gap="xl">
      <Paper className="panel" withBorder>
        <Title order={3}>Share a little of your Homarr.</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Choose exactly which boards a link can open. Revoke it from your worker at any time.
        </Text>
        <form onSubmit={create}>
          <div className="form-grid two" style={{ marginTop: 22 }}>
            <NativeSelect
              label="Access type"
              value={kind}
              onChange={(e) => {
                setKind(e.currentTarget.value);
                if (e.currentTarget.value === "invite" && duration === "permanent") setDuration("86400");
              }}
              data={[
                { value: "share", label: "Board link · no account required" },
                { value: "invite", label: "Device invitation" },
              ]}
            />
            <NativeSelect
              label="Link expiry"
              value={duration}
              onChange={(e) => setDuration(e.currentTarget.value)}
              data={[
                { value: "3600", label: "1 hour" },
                { value: "86400", label: "24 hours" },
                { value: "604800", label: "7 days" },
                ...(kind === "share" ? [{ value: "permanent", label: "Permanent · until revoked" }] : []),
              ]}
            />
            <TextInput
              label="Label"
              placeholder="Family board"
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
            />
            {kind === "invite" && (
              <NativeSelect
                label="Worker role"
                value={role}
                onChange={(e) => setRole(e.currentTarget.value)}
                data={[
                  { value: "viewer", label: "Viewer · selected boards" },
                  { value: "owner", label: "Owner · full worker access" },
                ]}
              />
            )}
          </div>
          <fieldset className="dashboard-picker">
            <legend>Boards this link may read</legend>
            <Stack gap="sm">
              {boards.map((board) => (
                <Checkbox
                  key={board.id}
                  label={board.name}
                  checked={boardIds.includes(board.id)}
                  disabled={kind === "invite" && role === "owner"}
                  onChange={(e) => {
                    if (e.currentTarget.checked) setBoardIds((ids) => [...ids, board.id]);
                    else setBoardIds((ids) => ids.filter((id) => id !== board.id));
                  }}
                />
              ))}
            </Stack>
            {!boards.length && (
              <Text size="sm" c="dimmed">
                Create a board before sharing viewer access.
              </Text>
            )}
          </fieldset>
          {kind === "share" && (
            <Checkbox
              mt="lg"
              label="Allow anyone with this link"
              description="Turn off for Worker members only: a device already approved by the worker owner."
              checked={anonymous}
              onChange={(event) => setAnonymous(event.currentTarget.checked)}
            />
          )}
          {kind === "invite" && role === "owner" && (
            <Alert color="yellow" mt="lg">
              An owner can manage integrations, other devices, and all boards on this worker.
            </Alert>
          )}
          <Button type="submit" mt="lg" loading={busy} leftSection={<Glyph name="link" />}>
            Create private link
          </Button>
        </form>
        {link && (
          <div className="copy-result">
            <div>
              <span>Private access link · keep it safe</span>
              <code data-private="true">{link}</code>
            </div>
            <CopyButton value={link}>
              {({ copied, copy }) => (
                <Button variant="light" onClick={copy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              )}
            </CopyButton>
          </div>
        )}
      </Paper>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      <Paper className="panel" withBorder>
        <Title order={3}>Active sharing links</Title>
        {shares.length === 0 && (
          <Text c="dimmed" size="sm" mt="lg">
            No sharing links yet.
          </Text>
        )}
        <div className="record-list">
          {shares.map((share) => (
            <div key={share.id} className="record">
              <Glyph name="globe" />
              <div className="grow">
                <strong>
                  {shareAudience(share)} · {share.boardIds.length} boards
                </strong>
                <span>
                  {expiryLabel(share.expiresAt)} · {share.id.slice(0, 10)}
                </span>
              </div>
              <Button variant="subtle" color="red" size="xs" onClick={() => revoke("shares", share.id)} disabled={busy}>
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </Paper>
      <Paper className="panel" withBorder>
        <Title order={3}>Device invitations</Title>
        {!invitations.length && (
          <Text c="dimmed" size="sm" mt="lg">
            No pending invitations.
          </Text>
        )}
        <div className="record-list">
          {invitations.map((invite) => (
            <div key={invite.id} className="record">
              <Glyph name="key" />
              <div className="grow">
                <strong>{invite.role} invitation</strong>
                <span>
                  {expiryLabel(invite.expiresAt)} · {invite.id.slice(0, 10)}
                </span>
              </div>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => revoke("invitations", invite.id)}
                disabled={busy}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </Paper>
      <Paper className="panel" withBorder>
        <Title order={3}>Connected devices</Title>
        <div className="record-list">
          {grants.map((grant) => (
            <div key={grant.id} className="record">
              <Glyph name="key" />
              <div className="grow">
                <strong>
                  {grant.role} device {grant.id === worker.grant.id && "· this browser"}
                </strong>
                <span>
                  {expiryLabel(grant.expiresAt)} · {grant.id.slice(0, 10)}
                </span>
              </div>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => revoke("grants", grant.id)}
                disabled={busy || grant.id === worker.grant.id}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </Paper>
      {session.user && directoryWorker && <DirectoryAccess session={session} worker={directoryWorker} />}
    </Stack>
  );
}
