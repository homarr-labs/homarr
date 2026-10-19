"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NativeSelect,
  Radio,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";
import type {
  EnrollmentChallenge,
  WorkerEnrollment,
  WorkerConnection as AccountWorker,
} from "@homarr/remote-platform/types";
import { Link } from "@homarr/ui";
import { workerRequest } from "@homarr/worker-client";
import type { SavedWorker, WorkerConnection } from "@homarr/worker-client";

import { useWorkerWorkspace } from "./context";
import { errorMessage, usePlatformAccount, WorkerAccount } from "./platform";
import { InlineConfirmation, WorkerCopyField, workerConnectionKey } from "./ui";
import classes from "./worker-settings.module.css";

type ServiceAccess = "query" | "interact" | "full";
type McpAccess = "query" | "interact";

interface CatalogTool {
  name: string;
  type: "query" | "mutation";
  pathInRouter: string[];
}
interface ServiceCatalog {
  tools: CatalogTool[];
  serviceProcedurePaths: string[];
  serviceAccessByPath: Record<string, ServiceAccess>;
}
interface Approval {
  id: string;
  workerId: string;
  organizationId: string | null;
  principalId: string;
  createdAt: number;
  grantId: string | null;
  expiresAt: number;
  active: boolean;
  current?: boolean;
  service?: { access: string; integrationIds: string[]; procedurePaths: string[] };
}
interface ApprovalList {
  approvals: Approval[];
  mcpUrl: string;
}
interface PreparedApproval {
  approvalId: string;
  devicePublicJwk: JsonWebKey;
  audience: string;
  principalId: string;
  organizationId: string | null;
  expiresAt: number;
  mcpUrl: string;
}
interface IntegrationOption {
  id: string;
  name: string;
}
interface CleanupTask {
  approval: Approval;
  hostedRetired: boolean;
  hostedRevoked: boolean;
  workerRevoked: boolean;
}
interface Cleanup {
  intent: "change" | "disconnect" | "rollback";
  tasks: CleanupTask[];
  reason?: string;
}

function permissionLabel(access?: string) {
  if (access === "interact") return "Read and actions";
  if (access === "full") return "Full access";
  if (access === "query") return "Read only";
  return "Existing access";
}

function integrationLabel(count: number) {
  if (count === 1) return "1 integration";
  return `${count} integrations`;
}

function cleanupTask(approval: Approval): CleanupTask {
  return {
    approval,
    hostedRetired: approval.current === false,
    hostedRevoked: false,
    workerRevoked: !approval.grantId,
  };
}

function pendingRetirement(approvals: Approval[]): Cleanup | null {
  const active = approvals.filter((approval) => approval.active && approval.expiresAt > Date.now());
  const retiring = active.filter((approval) => approval.current === false);
  if (!retiring.length) return null;
  let intent: Cleanup["intent"] = "disconnect";
  if (active.some((approval) => approval.current !== false)) intent = "change";
  return { intent, tasks: retiring.map(cleanupTask) };
}

/** The worker signs explicit current scopes; cloud sign-in alone never authorizes a worker. */
export function WorkerMcp({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const { session, request } = usePlatformAccount();
  const accountUserId = session.user?.id;
  const { organizationId } = useWorkerWorkspace();
  const api = useMemo(() => clientApi.createClient({ link: createWorkerLink(connection) }), [connection]);
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
  const [access, setAccess] = useState<McpAccess>("query");
  const [duration, setDuration] = useState("24");
  const [consent, setConsent] = useState(false);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [mcpUrl, setMcpUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [cleanup, setCleanup] = useState<Cleanup | null>(null);
  const alive = useRef(true);
  const scopeId = `${workerConnectionKey(connection)}:${organizationId ?? "personal"}:${accountUserId ?? "signed-out"}`;
  const currentScope = useRef({ id: scopeId, version: 0 });
  if (currentScope.current.id !== scopeId) {
    currentScope.current = { id: scopeId, version: currentScope.current.version + 1 };
  }
  const scopeVersion = currentScope.current.version;
  const isCurrent = useCallback(() => alive.current && currentScope.current.version === scopeVersion, [scopeVersion]);
  const isOwner = worker.grant.role === "owner";
  let principalId = `account:${accountUserId ?? ""}`;
  if (organizationId) principalId = `organization:${organizationId}`;
  const belongsToContext = useCallback(
    (approval: Approval) =>
      approval.workerId === worker.workerId &&
      approval.organizationId === organizationId &&
      approval.principalId === principalId,
    [worker.workerId, organizationId, principalId],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setBusy(false);
    setConsent(false);
    setFormOpen(false);
    setDisconnectOpen(false);
    setCleanup(null);
    setApprovals([]);
    setCatalog(null);
    setIntegrations([]);
    setMcpUrl("");
    setError("");
    setNotice("");
    if (!isOwner || !accountUserId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      workerRequest<ServiceCatalog>(connection, "/remote/mcp/catalog", { signal: controller.signal }),
      api.integration.all.query(undefined, { signal: controller.signal }),
      request<ApprovalList>("/api/mcp/approvals", { signal: controller.signal }),
    ])
      .then(([availableCatalog, availableIntegrations, savedApprovals]) => {
        if (!isCurrent() || controller.signal.aborted) return;
        setCatalog(availableCatalog);
        setIntegrations(availableIntegrations.map(({ id, name }) => ({ id, name })));
        const scoped = savedApprovals.approvals.filter(belongsToContext);
        setApprovals(scoped);
        setCleanup(pendingRetirement(scoped));
        setMcpUrl(savedApprovals.mcpUrl);
      })
      .catch((cause) => {
        if (isCurrent() && !controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (isCurrent() && !controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, connection, isCurrent, isOwner, belongsToContext, request, retry, accountUserId]);

  const procedurePaths = useMemo(() => {
    if (!catalog) return [];
    const supported = new Set(catalog.serviceProcedurePaths);
    const paths = new Set<string>();
    for (const tool of catalog.tools) {
      const path = tool.pathInRouter.join(".");
      if (!supported.has(path)) continue;
      const minimumAccess = catalog.serviceAccessByPath[path];
      if (minimumAccess !== "query" && minimumAccess !== "interact") continue;
      if (minimumAccess === "interact" && access !== "interact") continue;
      if (access === "query" && tool.type !== "query") continue;
      paths.add(path);
    }
    return [...paths];
  }, [catalog, access]);
  const activeApprovals = approvals.filter((approval) => approval.active && approval.expiresAt > Date.now());
  const effectiveApprovals = new Map(activeApprovals.map((approval) => [approval.id, approval]));
  for (const task of cleanup?.tasks ?? []) {
    if (task.approval.expiresAt > Date.now()) effectiveApprovals.set(task.approval.id, task.approval);
  }
  const effectiveAccess = new Set([...effectiveApprovals.values()].map((approval) => approval.service?.access));
  let accessLabel = "Existing access";
  if (effectiveAccess.size > 1) accessLabel = "Mixed access";
  else if (effectiveAccess.size === 1) accessLabel = permissionLabel([...effectiveAccess][0]);
  const approvedIntegrations = new Set(
    [...effectiveApprovals.values()].flatMap((approval) => approval.service?.integrationIds ?? []),
  );
  const showForm = !activeApprovals.length || formOpen;
  const overLimit = integrations.length > 1_000 || procedurePaths.length > 500;
  const ready =
    !busy &&
    !loading &&
    Boolean(worker.relayUrl) &&
    Boolean(integrations.length) &&
    Boolean(procedurePaths.length) &&
    consent &&
    !cleanup &&
    !overLimit;

  async function enrollForMcp() {
    const { workers } = await request<{ workers: AccountWorker[] }>("/api/workers");
    if (!isCurrent()) throw new Error("The account or worker changed. Open MCP again to continue.");
    const existing = workers.find((entry) => entry.workerId === worker.workerId);
    const metadata = { mode: worker.mode, relayUrl: worker.relayUrl || null, directUrl: worker.directUrl || null };
    if (existing) {
      if (
        existing.mode !== metadata.mode ||
        existing.relayUrl !== metadata.relayUrl ||
        existing.directUrl !== metadata.directUrl
      ) {
        await request(`/api/workers/${encodeURIComponent(worker.workerId)}`, {
          method: "PATCH",
          body: JSON.stringify(metadata),
        });
      }
      return;
    }
    const { challenge } = await request<{ challenge: EnrollmentChallenge }>("/api/workers/challenge", {
      method: "POST",
    });
    if (!isCurrent()) throw new Error("The account or worker changed. Open MCP again to continue.");
    const proof = await workerRequest<
      Pick<WorkerEnrollment, "workerId" | "workerPublicKey" | "workerSigningKey" | "signature">
    >(connection, "/remote/platform-enrollment", { method: "POST", body: JSON.stringify({ challenge }) });
    if (!isCurrent()) throw new Error("The account or worker changed. Open MCP again to continue.");
    await request("/api/workers", {
      method: "POST",
      body: JSON.stringify({ ...proof, challenge, name: worker.name, ...metadata }),
    });
  }

  function markInactive(id: string) {
    if (!isCurrent()) return;
    setApprovals((current) =>
      current.map((approval) => {
        if (approval.id !== id) return approval;
        return { ...approval, active: false };
      }),
    );
  }

  async function currentApprovals() {
    const result = await request<ApprovalList>("/api/mcp/approvals");
    if (!isCurrent()) throw new Error("The account or worker changed. Open MCP again to continue.");
    return { ...result, approvals: result.approvals.filter(belongsToContext) };
  }

  async function revokeHostedApproval(id: string, options: { rollback?: boolean; retain?: boolean } = {}) {
    let path = `/api/mcp/approvals/${encodeURIComponent(id)}`;
    const params = new URLSearchParams();
    if (options.rollback) params.set("rollback", "1");
    if (options.retain) params.set("retain", "1");
    if (params.size) path += `?${params}`;
    try {
      await request(path, { method: "DELETE" });
    } catch (cause) {
      // A lost response or a previous retry may already have removed this record.
      const result = await currentApprovals();
      const remaining = result.approvals.find((approval) => approval.id === id);
      if (!remaining || (options.retain && remaining.current === false)) return;
      throw cause;
    }
  }

  async function revokeWorkerGrant(id: string) {
    const response = await connection.fetch(`/remote/access/grants/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok || response.status === 404) {
      await response.body?.cancel();
      return;
    }
    const body: unknown = await response.json().catch(() => null);
    let message = `The worker could not revoke access (${response.status}).`;
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error;
    throw new Error(message);
  }

  async function cleanUp(tasks: CleanupTask[], intent: Cleanup["intent"]) {
    const remaining: CleanupTask[] = [];
    let reason = "";
    for (const task of tasks) {
      if (!isCurrent()) return { remaining: tasks, reason };
      if (!belongsToContext(task.approval)) throw new Error("MCP cleanup belongs to another account or worker.");
      if (task.approval.expiresAt <= Date.now()) {
        markInactive(task.approval.id);
        continue;
      }
      const next = { ...task };
      let phases: ("retire" | "worker" | "delete")[] = ["worker", "delete"];
      if (intent !== "change") phases = ["retire", "worker", "delete"];
      for (const phase of phases) {
        if (!isCurrent()) return { remaining: tasks, reason };
        if (phase === "retire" && next.hostedRetired) continue;
        if (phase === "worker" && next.workerRevoked) continue;
        if (phase === "delete" && next.hostedRevoked) continue;
        // Keep retry metadata until the worker grant is gone, and stop routing before revoking current access.
        if (phase === "worker" && intent !== "change" && !next.hostedRetired) break;
        if (phase === "delete" && !next.workerRevoked) break;
        try {
          if (phase === "retire") {
            await revokeHostedApproval(next.approval.id, { retain: true, rollback: intent === "rollback" });
            next.hostedRetired = true;
            if (isCurrent())
              setApprovals((current) =>
                current.map((approval) => {
                  if (approval.id !== next.approval.id) return approval;
                  return { ...approval, current: false };
                }),
              );
          } else if (phase === "worker") {
            if (next.approval.grantId) await revokeWorkerGrant(next.approval.grantId);
            next.workerRevoked = true;
          } else {
            await revokeHostedApproval(next.approval.id);
            next.hostedRevoked = true;
          }
        } catch (cause) {
          if (!reason) reason = errorMessage(cause);
        }
      }
      if (next.hostedRevoked) markInactive(next.approval.id);
      if (!next.hostedRevoked || !next.workerRevoked) remaining.push(next);
    }
    return { remaining, reason };
  }

  async function finishCleanup(tasks: CleanupTask[], intent: Cleanup["intent"], success: string) {
    if (isCurrent() && tasks.length) setCleanup({ intent, tasks });
    const result = await cleanUp(tasks, intent);
    if (!isCurrent()) return;
    if (result.remaining.length) {
      setCleanup({ intent, tasks: result.remaining, reason: result.reason });
      setNotice("");
      return;
    }
    setCleanup(null);
    if (intent === "rollback") {
      const saved = await currentApprovals();
      if (!isCurrent()) return;
      setApprovals(saved.approvals);
      setMcpUrl(saved.mcpUrl);
      setCleanup(pendingRetirement(saved.approvals));
    }
    setNotice(success);
  }

  function isConfirmedActivation(approval: Approval, issued: Approval) {
    return (
      belongsToContext(approval) &&
      approval.id === issued.id &&
      approval.grantId === issued.grantId &&
      approval.active &&
      approval.current !== false &&
      approval.expiresAt > Date.now()
    );
  }

  async function finishActivation(approval: Approval, url: string, saved: Approval[], previous: Approval[]) {
    if (!isCurrent()) return;
    setApprovals([...saved.filter((entry) => entry.id !== approval.id), approval]);
    setMcpUrl(url);
    setConsent(false);
    setFormOpen(false);
    setDisconnectOpen(false);
    let success = "MCP access enabled. Copy the server URL into your MCP client.";
    if (previous.length) success = "MCP access updated.";
    await finishCleanup(previous.map(cleanupTask), "change", success);
  }

  async function approve() {
    if (!ready || !isCurrent()) return;
    setBusy(true);
    setError("");
    setNotice("");
    let uncommitted: Approval | null = null;
    let previous: Approval[] = [];
    let activatedAccess = false;
    let activationSent = false;
    try {
      await enrollForMcp();
      const saved = await currentApprovals();
      previous = saved.approvals.filter((approval) => approval.active && approval.expiresAt > Date.now());
      setApprovals(saved.approvals);
      const body: { workerId: string; organizationId?: string } = { workerId: worker.workerId };
      if (organizationId) body.organizationId = organizationId;
      const prepared = await request<PreparedApproval>("/api/mcp/approvals/prepare", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!isCurrent() || prepared.organizationId !== organizationId || prepared.principalId !== principalId)
        throw new Error("The account or worker changed. Open MCP again before approving access.");
      let expiresAt = Math.min(prepared.expiresAt, Date.now() + Number(duration) * 60 * 60 * 1_000);
      if (worker.grant.expiresAt) expiresAt = Math.min(expiresAt, worker.grant.expiresAt);
      if (expiresAt <= Date.now())
        throw new Error("This browser’s owner access has expired. Reconnect your worker first.");
      const service: {
        purpose: "mcp";
        integrationIds: string[];
        access: McpAccess;
        procedurePaths: string[];
        audience: string;
        principalId: string;
        organizationId?: string;
      } = {
        purpose: "mcp",
        integrationIds: integrations.map(({ id }) => id),
        access,
        procedurePaths,
        audience: prepared.audience,
        principalId: prepared.principalId,
      };
      if (prepared.organizationId) service.organizationId = prepared.organizationId;
      const { grant } = await workerRequest<{ grant: { id: string; token: string } }>(
        connection,
        "/remote/access/services",
        {
          method: "POST",
          body: JSON.stringify({ devicePublicJwk: prepared.devicePublicJwk, service, expiresAt }),
        },
      );
      uncommitted = {
        id: prepared.approvalId,
        workerId: worker.workerId,
        organizationId,
        principalId,
        createdAt: Date.now(),
        expiresAt,
        active: true,
        grantId: grant.id,
        service,
      };
      if (!isCurrent()) throw new Error("The account or worker changed before access was approved.");
      activationSent = true;
      const activated = await request<{ approval: Approval; mcpUrl: string }>("/api/mcp/approvals", {
        method: "POST",
        body: JSON.stringify({ approvalId: prepared.approvalId, grant, capability: worker.relayCapability }),
      });
      if (!isConfirmedActivation(activated.approval, uncommitted)) {
        throw new Error("The hosted service did not confirm the expected MCP access.");
      }
      uncommitted = null;
      activatedAccess = true;
      await finishActivation(activated.approval, activated.mcpUrl, saved.approvals, previous);
    } catch (cause) {
      if (uncommitted && isCurrent()) {
        const issuedAttempt = uncommitted;
        try {
          const observed = await currentApprovals();
          const confirmed = observed.approvals.find((approval) => isConfirmedActivation(approval, issuedAttempt));
          if (confirmed) {
            // Activation can succeed even when its response is lost. Keep the verified current access.
            uncommitted = null;
            activatedAccess = true;
            await finishActivation(confirmed, observed.mcpUrl, observed.approvals, previous);
            return;
          }
        } catch {
          // An uncertain result is removed through the server's explicit rollback contract below.
        }
      }
      if (isCurrent()) {
        setError(errorMessage(cause));
        if (activatedAccess && previous.length) setCleanup({ intent: "change", tasks: previous.map(cleanupTask) });
      }
      if (uncommitted) {
        if (!isCurrent()) {
          if (!activationSent) {
            try {
              if (uncommitted.grantId) await revokeWorkerGrant(uncommitted.grantId);
            } catch {
              // The cancelled attempt's device grant remains bounded by its signed expiry.
            }
          }
          return;
        }
        const result = await cleanUp([cleanupTask(uncommitted)], "rollback");
        if (isCurrent()) {
          if (result.remaining.length)
            setCleanup({ intent: "rollback", tasks: result.remaining, reason: result.reason });
          else {
            try {
              const saved = await currentApprovals();
              if (isCurrent()) {
                setApprovals(saved.approvals);
                setMcpUrl(saved.mcpUrl);
                setCleanup(pendingRetirement(saved.approvals));
              }
            } catch {
              // Keep the conservative scope summary until account metadata can be refreshed.
            }
          }
        }
      }
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  async function disconnect() {
    if (busy || !isCurrent()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await currentApprovals();
      const tasks = new Map(
        saved.approvals
          .filter((approval) => approval.active && approval.expiresAt > Date.now())
          .map((approval) => [approval.id, cleanupTask(approval)]),
      );
      for (const task of cleanup?.tasks ?? []) tasks.set(task.approval.id, task);
      setApprovals(saved.approvals);
      setFormOpen(false);
      setConsent(false);
      setDisconnectOpen(false);
      await finishCleanup([...tasks.values()], "disconnect", "MCP access disconnected.");
    } catch (cause) {
      if (isCurrent()) setError(errorMessage(cause));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  async function retryCleanup() {
    if (!cleanup || busy || !isCurrent()) return;
    setBusy(true);
    setError("");
    let success = "The incomplete access change was removed.";
    if (cleanup.intent === "change") success = "MCP access updated.";
    if (cleanup.intent === "disconnect") success = "MCP access disconnected.";
    try {
      await finishCleanup(cleanup.tasks, cleanup.intent, success);
    } catch (cause) {
      if (isCurrent()) setError(errorMessage(cause));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  let cleanupTitle = "Access change needs cleanup";
  let cleanupDescription =
    "The new access was not confirmed. Retry to remove permissions issued for this attempt. Earlier access may still apply.";
  if (cleanup?.intent === "change") {
    cleanupTitle = "Access change incomplete";
    cleanupDescription = "Permissions from another access setting may still apply. Retry to finish removing them.";
  }
  if (cleanup?.intent === "disconnect") {
    cleanupTitle = "MCP is not fully disconnected";
    cleanupDescription = "Some hosted access or worker permissions still need revoking. Retry to finish disconnecting.";
  }
  let statusColor = "green";
  let statusLabel = "Enabled";
  if (cleanup) {
    statusColor = "yellow";
    statusLabel = "Cleanup needed";
  }
  let saveLabel = "Enable MCP";
  if (activeApprovals.length) saveLabel = "Save access";
  let integrationScopeDescription = `Includes all ${integrations.length} current integrations and their supported tools.`;
  if (integrations.length === 1)
    integrationScopeDescription = "Includes 1 current integration and its supported tools.";

  if (!isOwner)
    return (
      <Text size="sm" c="dimmed">
        A worker owner can connect an MCP client.
      </Text>
    );

  return (
    <Stack gap="xl">
      <div>
        <Title order={3} className={classes.sectionHeading}>
          Connect an assistant
        </Title>
        <Text size="sm" c="dimmed" className={classes.prose}>
          Use your worker’s integrations from an MCP client. Choose what it can do, then add the server URL to your
          client.
        </Text>
      </div>
      <WorkerAccount />
      {session.user && (
        <>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {notice && (
            <Text component="output" size="sm" c="green">
              {notice}
            </Text>
          )}
          {loading && (
            <Stack gap="md" aria-label="Loading MCP access" aria-busy="true">
              <Skeleton height={36} />
              <Skeleton height={72} />
              <Skeleton height={36} />
            </Stack>
          )}
          {!loading && !catalog && (
            <Group>
              <Button variant="default" onClick={() => setRetry((value) => value + 1)}>
                Retry
              </Button>
            </Group>
          )}
          {!loading && catalog && (
            <>
              {!worker.relayUrl && (
                <Alert color="yellow">
                  Hosted MCP needs an encrypted relay connection to reach your worker.{" "}
                  <Link href="/manage/workers?tab=connection">Change connection</Link>
                </Alert>
              )}
              {cleanup && (
                <Alert color="yellow" title={cleanupTitle}>
                  <Stack gap="sm">
                    <Text size="sm">{cleanupDescription}</Text>
                    {cleanup.reason && <Text size="xs">{cleanup.reason}</Text>}
                    <Group>
                      <Button variant="default" size="sm" loading={busy} onClick={() => void retryCleanup()}>
                        Retry cleanup
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              )}
              {activeApprovals.length > 0 && (
                <section>
                  <Stack gap="md">
                    <Group gap="sm">
                      <Title order={4}>MCP access</Title>
                      <Badge variant="light" color={statusColor}>
                        {statusLabel}
                      </Badge>
                    </Group>
                    <div className={classes.rowContent}>
                      <div className={classes.rowInfo}>
                        <Text size="sm" fw={600}>
                          {accessLabel}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {integrationLabel(approvedIntegrations.size)}
                        </Text>
                        {effectiveApprovals.size === 1 && (
                          <Text size="sm" c="dimmed">
                            Expires {new Date([...effectiveApprovals.values()][0]?.expiresAt ?? 0).toLocaleString()}
                          </Text>
                        )}
                        {effectiveApprovals.size > 1 && (
                          <Text size="sm" c="dimmed">
                            Multiple access settings are active. Change access to replace them.
                          </Text>
                        )}
                      </div>
                      <div className={classes.rowActions}>
                        {!formOpen && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={busy || Boolean(cleanup)}
                            onClick={() => {
                              setAccess("query");
                              if (effectiveAccess.size === 1 && effectiveAccess.has("interact")) setAccess("interact");
                              setConsent(false);
                              setFormOpen(true);
                              setDisconnectOpen(false);
                              setError("");
                              setNotice("");
                            }}
                            aria-expanded={formOpen}
                          >
                            Change access
                          </Button>
                        )}
                        <Button
                          variant="subtle"
                          color="red"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setDisconnectOpen(true);
                            setError("");
                          }}
                          aria-expanded={disconnectOpen}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    {disconnectOpen && (
                      <InlineConfirmation
                        title="Disconnect MCP?"
                        description="This ends all hosted MCP access to this worker in the current account or organization. You can connect again later."
                        action="Disconnect MCP"
                        busy={busy}
                        onCancel={() => setDisconnectOpen(false)}
                        onConfirm={() => void disconnect()}
                        error={error}
                      />
                    )}
                    {mcpUrl && (
                      <div className={classes.endpoint}>
                        <WorkerCopyField label="MCP server URL" value={mcpUrl} />
                        <Text size="xs" c="dimmed" mt="sm">
                          Add this URL to your MCP client and sign in with your Homarr account.
                        </Text>
                      </div>
                    )}
                    {effectiveApprovals.size > 1 && (
                      <details className={classes.details}>
                        <summary>Access details</summary>
                        <ul className={`${classes.detailsContent} ${classes.list}`}>
                          {[...effectiveApprovals.values()].map((approval) => (
                            <li key={approval.id} className={classes.listRow}>
                              <Text size="sm" fw={500}>
                                {permissionLabel(approval.service?.access)}
                              </Text>
                              <Text size="sm" c="dimmed">
                                Expires {new Date(approval.expiresAt).toLocaleString()}
                              </Text>
                              {approval.service && (
                                <Text size="xs" c="dimmed">
                                  {integrationLabel(approval.service.integrationIds.length)}
                                </Text>
                              )}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </Stack>
                </section>
              )}
              {!integrations.length && (
                <div className={classes.emptyState}>
                  <Stack gap="sm">
                    <Text fw={500} size="sm">
                      Add an integration first
                    </Text>
                    <Text size="sm" c="dimmed">
                      MCP uses the integrations already configured on this worker.
                    </Text>
                    <Group>
                      <Button component={Link} href="/manage/integrations" variant="default" size="sm">
                        Manage integrations
                      </Button>
                    </Group>
                  </Stack>
                </div>
              )}
              {showForm && integrations.length > 0 && (
                <section>
                  <Stack gap="lg" className={classes.formFields}>
                    {activeApprovals.length > 0 && <Title order={4}>Change MCP access</Title>}
                    <Radio.Group
                      label="Assistant permissions"
                      value={access}
                      onChange={(value) => {
                        if (value !== "query" && value !== "interact") return;
                        setAccess(value);
                        setConsent(false);
                      }}
                    >
                      <div className={classes.permissionChoices}>
                        <Radio
                          className={classes.permissionOption}
                          value="query"
                          label="Read only"
                          description="Read information from your integrations."
                          disabled={busy}
                        />
                        <Radio
                          className={classes.permissionOption}
                          value="interact"
                          label="Read and actions"
                          description="Also run supported actions in your integrations."
                          disabled={busy}
                        />
                      </div>
                    </Radio.Group>
                    <Text size="sm" c="dimmed" className={classes.prose}>
                      {integrationScopeDescription} New integrations need an access update.
                    </Text>
                    {!procedurePaths.length && (
                      <Alert color="yellow">This worker has no supported MCP tools for this permission.</Alert>
                    )}
                    {overLimit && (
                      <Alert color="red">
                        This worker exceeds the MCP limit of 1,000 integrations or 500 tools. Access has not been
                        granted.
                      </Alert>
                    )}
                    <NativeSelect
                      label="Expires after"
                      value={duration}
                      disabled={busy}
                      onChange={(event) => {
                        setDuration(event.currentTarget.value);
                        setConsent(false);
                      }}
                      data={[
                        { value: "1", label: "1 hour" },
                        { value: "24", label: "24 hours" },
                        { value: "168", label: "7 days" },
                      ]}
                      maw={280}
                    />
                    {worker.grant.expiresAt && (
                      <Text size="xs" c="dimmed">
                        Access also ends when this browser’s owner access expires on{" "}
                        {new Date(worker.grant.expiresAt).toLocaleString()}.
                      </Text>
                    )}
                    {organizationId && (
                      <Text size="sm">
                        This approval applies to the selected organization and its authorized members.
                      </Text>
                    )}
                    <Checkbox
                      label="Allow Homarr’s hosted MCP service to read authorized tool arguments and results."
                      checked={consent}
                      disabled={busy || !worker.relayUrl || Boolean(cleanup)}
                      onChange={(event) => setConsent(event.currentTarget.checked)}
                    />
                    <Group gap="sm">
                      <Button loading={busy} disabled={!ready} onClick={() => void approve()}>
                        {saveLabel}
                      </Button>
                      {formOpen && (
                        <Button
                          variant="default"
                          disabled={busy}
                          onClick={() => {
                            setFormOpen(false);
                            setConsent(false);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </section>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}
