import {
  Alert,
  Button,
  CopyButton,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import type { PlatformSession, WorkerConnection, WorkerInvite, WorkerMember } from "@homarr/remote-platform/types";
import { errorMessage, expiryLabel, platformRequest } from "../lib/platform";
import { WorkshopSignIn } from "./workshop-sign-in";
import { Glyph } from "./icons";

export function AccountPanel({
  session,
  workers,
  refresh,
}: {
  session: PlatformSession;
  workers: WorkerConnection[];
  refresh: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session.user) return <WorkshopSignIn onSignedIn={refresh} />;

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await platformRequest("/api/invites/redeem", session, {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setCode("");
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await platformRequest("/auth/logout", session, { method: "POST" });
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap="xl">
      <Paper className="panel" withBorder>
        <Group justify="space-between" align="start">
          <div>
            <div className="eyebrow">Homarr account</div>
            <Title order={2}>{session.user.name || session.user.login}</Title>
            <Text c="dimmed">@{session.user.login}</Text>
          </div>
          <Button variant="default" onClick={logout} loading={busy}>
            Sign out
          </Button>
        </Group>
        <div className="account-facts">
          <div>
            <span>Directory</span>
            <strong>{workers.length} workers</strong>
          </div>
          <div>
            <span>Private keys</span>
            <strong>On this device</strong>
          </div>
          <div>
            <span>Board data</span>
            <strong>On your server</strong>
          </div>
        </div>
        <Text size="sm" c="dimmed">
          Signing out keeps this browser's worker keys. Use “Forget this device” on a worker to remove its local access.
        </Text>
      </Paper>
      <Paper className="panel" withBorder>
        <Title order={3}>Have an invitation?</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Join another worker's directory with the code you received. The owner must also share worker access with you.
        </Text>
        <form onSubmit={redeem}>
          <Group align="end" mt="lg">
            <TextInput
              label="Invitation code"
              placeholder="Paste an invitation code"
              required
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              autoComplete="off"
              className="grow"
            />
            <Button type="submit" loading={busy}>
              Accept invitation
            </Button>
          </Group>
        </form>
      </Paper>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export function DirectoryAccess({ session, worker }: { session: PlatformSession; worker: WorkerConnection }) {
  const [members, setMembers] = useState<WorkerMember[]>([]);
  const [invites, setInvites] = useState<WorkerInvite[]>([]);
  const [role, setRole] = useState("member");
  const [hours, setHours] = useState<string | number>(24);
  const [maxUses, setMaxUses] = useState<string | number>(1);
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManage = worker.role === "owner" || worker.role === "admin";
  const base = `/api/workers/${encodeURIComponent(worker.workerId)}`;
  const load = useCallback(async () => {
    let inviteRequest = Promise.resolve({ invites: [] as WorkerInvite[] });
    if (canManage) inviteRequest = platformRequest<{ invites: WorkerInvite[] }>(`${base}/invites`, session);
    const [memberResponse, inviteResponse] = await Promise.all([
      platformRequest<{ members: WorkerMember[] }>(`${base}/members`, session),
      inviteRequest,
    ]);
    setMembers(memberResponse.members);
    setInvites(inviteResponse.invites);
  }, [base, session, canManage]);
  useEffect(() => {
    let active = true;
    setError("");
    void load().catch((cause) => {
      if (active) setError(errorMessage(cause));
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await platformRequest<{ code: string }>(`${base}/invites`, session, {
        method: "POST",
        body: JSON.stringify({ role, expiresInSeconds: Number(hours) * 3600, maxUses: Number(maxUses) }),
      });
      setNewCode(response.code);
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(inviteId: string) {
    setBusy(true);
    setError("");
    try {
      await platformRequest(`${base}/invites/${encodeURIComponent(inviteId)}`, session, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function removeMember(userId: string) {
    setBusy(true);
    setError("");
    try {
      await platformRequest(`${base}/members/${encodeURIComponent(userId)}`, session, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack gap="lg">
      <Paper className="panel" withBorder>
        <Title order={3}>People in {worker.name}</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Directory membership and private worker access are managed separately.
        </Text>
        <div className="record-list">
          {members.map((member) => (
            <div className="record" key={member.user.id}>
              <span className="person-avatar">{member.user.login.slice(0, 1).toUpperCase()}</span>
              <div className="grow">
                <strong>{member.user.name || member.user.login}</strong>
                <span>@{member.user.login}</span>
              </div>
              <span className="pill">{member.role}</span>
              {canManage && member.role !== "owner" && (worker.role === "owner" || member.role === "member") && (
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => removeMember(member.user.id)}
                  disabled={busy}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Paper>
      {canManage && (
        <Paper className="panel" withBorder>
          <Title order={3}>Invite someone</Title>
          <form onSubmit={createInvite}>
            <div className="form-grid" style={{ marginTop: 20 }}>
              <NativeSelect
                label="Directory role"
                value={role}
                onChange={(e) => setRole(e.currentTarget.value)}
                data={[
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Administrator" },
                ]}
              />
              <NumberInput label="Expires in hours" min={1} max={720} value={hours} onChange={setHours} />
              <NumberInput label="Maximum uses" min={1} max={100} value={maxUses} onChange={setMaxUses} />
            </div>
            <Button type="submit" mt="lg" loading={busy} leftSection={<Glyph name="plus" />}>
              Create invitation
            </Button>
          </form>
          {newCode && (
            <div className="copy-result">
              <div>
                <span>Invitation code · shown once</span>
                <code>{newCode}</code>
              </div>
              <CopyButton value={newCode}>
                {({ copied, copy }) => (
                  <Button variant="light" onClick={copy}>
                    {copied ? "Copied" : "Copy code"}
                  </Button>
                )}
              </CopyButton>
            </div>
          )}
          <div className="record-list">
            {invites
              .filter((invite) => !invite.revokedAt)
              .map((invite) => (
                <div className="record" key={invite.inviteId}>
                  <div className="grow">
                    <strong>{invite.role} invitation</strong>
                    <span>
                      {expiryLabel(invite.expiresAt)} · {invite.uses}/{invite.maxUses} uses
                    </span>
                  </div>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => revoke(invite.inviteId)}
                    disabled={busy}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
          </div>
        </Paper>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
