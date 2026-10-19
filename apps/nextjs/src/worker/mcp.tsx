"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NativeSelect,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";
import { workerRequest } from "@homarr/worker-client";
import type { SavedWorker, WorkerConnection } from "@homarr/worker-client";

import { useWorkerWorkspace } from "./context";
import { errorMessage, usePlatformAccount } from "./platform";

interface CatalogTool {
  name: string;
  description: string;
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
  grantId: string | null;
  expiresAt: number;
  active: boolean;
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
  kind: string;
}

type ServiceAccess = "query" | "interact" | "full";
const accessLevel: Record<ServiceAccess, number> = { query: 0, interact: 1, full: 2 };

/** The account service receives a separate, explicitly approved worker credential. */
export function WorkerMcp({ worker, connection }: { worker: SavedWorker; connection: WorkerConnection }) {
  const { session, request } = usePlatformAccount();
  const { organizationId } = useWorkerWorkspace();
  const api = useMemo(() => clientApi.createClient({ link: createWorkerLink(connection) }), [connection]);
  const [tools, setTools] = useState<CatalogTool[]>([]);
  const [toolAccess, setToolAccess] = useState<Record<string, ServiceAccess>>({});
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
  const [integrationIds, setIntegrationIds] = useState<string[]>([]);
  const [procedurePaths, setProcedurePaths] = useState<string[]>([]);
  const [access, setAccess] = useState<ServiceAccess>("query");
  const [duration, setDuration] = useState("24");
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState(false);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [mcpUrl, setMcpUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unrevokedGrantId, setUnrevokedGrantId] = useState<string | null>(null);
  const isOwner = worker.grant.role === "owner";

  const refreshApprovals = useCallback(async () => {
    const result = await request<ApprovalList>("/api/mcp/approvals");
    setApprovals(
      result.approvals.filter(
        (approval) => approval.workerId === worker.workerId && approval.organizationId === organizationId,
      ),
    );
    setMcpUrl(result.mcpUrl);
  }, [request, worker.workerId, organizationId]);

  useEffect(() => {
    let active = true;
    setIntegrationIds([]);
    setProcedurePaths([]);
    setConsent(false);
    setApprovals([]);
    setTools([]);
    setToolAccess({});
    setIntegrations([]);
    setError("");
    setNotice("");
    if (!isOwner || !session.user) return;
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      workerRequest<ServiceCatalog>(connection, "/remote/mcp/catalog", { signal: controller.signal }),
      api.integration.all.query(undefined, { signal: controller.signal }),
      request<ApprovalList>("/api/mcp/approvals", { signal: controller.signal }),
    ])
      .then(([catalog, availableIntegrations, savedApprovals]) => {
        if (!active) return;
        const eligiblePaths = new Set(catalog.serviceProcedurePaths);
        setTools(catalog.tools.filter((tool) => eligiblePaths.has(tool.pathInRouter.join("."))));
        setToolAccess(catalog.serviceAccessByPath);
        setIntegrations(availableIntegrations.map(({ id, name, kind }) => ({ id, name, kind })));
        setApprovals(
          savedApprovals.approvals.filter(
            (approval) => approval.workerId === worker.workerId && approval.organizationId === organizationId,
          ),
        );
        setMcpUrl(savedApprovals.mcpUrl);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, connection, isOwner, organizationId, request, session.user, worker.workerId]);

  function toggleIntegration(id: string, checked: boolean) {
    setConsent(false);
    setIntegrationIds((current) => {
      if (checked) return [...current, id];
      return current.filter((value) => value !== id);
    });
  }

  function toggleTool(path: string, checked: boolean) {
    setConsent(false);
    setProcedurePaths((current) => {
      if (checked) return [...current, path];
      return current.filter((value) => value !== path);
    });
  }

  function changeAccess(value: string) {
    if (value !== "query" && value !== "interact" && value !== "full") return;
    setAccess(value);
    setConsent(false);
    const allowedPaths = new Set(
      tools.filter((tool) => selectableTool(tool, value)).map((tool) => tool.pathInRouter.join(".")),
    );
    setProcedurePaths((current) => current.filter((path) => allowedPaths.has(path)));
  }

  function selectableTool(tool: CatalogTool, permission: ServiceAccess): boolean {
    const minimumAccess = toolAccess[tool.pathInRouter.join(".")];
    if (!minimumAccess || accessLevel[minimumAccess] > accessLevel[permission]) return false;
    if (permission === "query" && tool.type !== "query") return false;
    return true;
  }

  async function approve() {
    if (!consent || !integrationIds.length || !procedurePaths.length || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    let issuedGrantId: string | null = null;
    try {
      const body: { workerId: string; organizationId?: string } = { workerId: worker.workerId };
      if (organizationId) body.organizationId = organizationId;
      const prepared = await request<PreparedApproval>("/api/mcp/approvals/prepare", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (prepared.organizationId !== organizationId)
        throw new Error("The account context changed. Reload this panel before approving access.");
      const expiresAt = Math.min(prepared.expiresAt, Date.now() + Number(duration) * 60 * 60 * 1000);
      const service: {
        purpose: "mcp";
        integrationIds: string[];
        access: ServiceAccess;
        procedurePaths: string[];
        audience: string;
        principalId: string;
        organizationId?: string;
      } = {
        purpose: "mcp",
        integrationIds,
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
      issuedGrantId = grant.id;
      await request("/api/mcp/approvals", {
        method: "POST",
        body: JSON.stringify({ approvalId: prepared.approvalId, grant, capability: worker.relayCapability }),
      });
      issuedGrantId = null;
      setConsent(false);
      setNotice(
        "Hosted MCP access approved. Add the MCP address below to your client and sign in with your Homarr account.",
      );
      await refreshApprovals();
    } catch (cause) {
      setError(errorMessage(cause));
      if (issuedGrantId) {
        try {
          await workerRequest(connection, `/remote/access/grants/${encodeURIComponent(issuedGrantId)}`, {
            method: "DELETE",
          });
        } catch {
          setUnrevokedGrantId(issuedGrantId);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(approval: Approval) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/mcp/approvals/${encodeURIComponent(approval.id)}`, { method: "DELETE" });
      setApprovals((current) =>
        current.map((entry) => {
          if (entry.id !== approval.id) return entry;
          return { ...entry, active: false };
        }),
      );
      if (approval.grantId) {
        try {
          await workerRequest(connection, `/remote/access/grants/${encodeURIComponent(approval.grantId)}`, {
            method: "DELETE",
          });
        } catch {
          setUnrevokedGrantId(approval.grantId);
          setNotice(
            "Hosted access is disabled and its stored credential deleted. Revoke the worker grant when the worker is reachable, or let it expire.",
          );
          return;
        }
      }
      setNotice("Hosted MCP access and its worker grant have been revoked.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function revokeRemainingGrant() {
    if (!unrevokedGrantId) return;
    setBusy(true);
    setError("");
    try {
      await workerRequest(connection, `/remote/access/grants/${encodeURIComponent(unrevokedGrantId)}`, {
        method: "DELETE",
      });
      setUnrevokedGrantId(null);
      setNotice("The worker grant has been revoked.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
    } catch {
      setError("Copy the MCP address from the field below.");
    }
  }

  if (!isOwner) return <Alert>Only a worker owner can approve hosted MCP access.</Alert>;
  if (!session.user) return <Alert>Sign in to your Homarr cloud account above to approve hosted MCP access.</Alert>;

  const searchValue = search.toLocaleLowerCase().trim();
  const visibleTools = tools.filter(
    (tool) =>
      selectableTool(tool, access) && `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(searchValue),
  );
  const ready =
    !loading &&
    !busy &&
    !!worker.relayUrl &&
    !!integrationIds.length &&
    !!procedurePaths.length &&
    consent &&
    !unrevokedGrantId;

  return (
    <Stack>
      <Text fw={600}>Use this worker from your MCP client</Text>
      <Text size="sm" c="dimmed">
        Approve specific integrations and tools for your Homarr account. Choose an organization to make this access
        available to its authorized members.
      </Text>
      <Alert color="yellow">
        The hosted MCP service can read authorized tool arguments and results. It receives a separate, limited worker
        credential. The relay still carries encrypted messages; your owner key stays in this browser.
      </Alert>
      {organizationId && <Text size="sm">Approval applies to the selected organization.</Text>}
      {!worker.relayUrl && (
        <Alert color="yellow">
          This worker needs a relay connection for hosted MCP. A direct connection alone cannot be reached by the hosted
          service.
        </Alert>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert color="blue" aria-live="polite">
          {notice}
        </Alert>
      )}
      {unrevokedGrantId && (
        <Button color="red" variant="light" onClick={() => void revokeRemainingGrant()} loading={busy}>
          Revoke remaining worker grant
        </Button>
      )}
      <NativeSelect
        label="Integration permission"
        value={access}
        disabled={busy || loading}
        onChange={(event) => changeAccess(event.currentTarget.value)}
        data={[
          { value: "query", label: "Read only" },
          { value: "interact", label: "Read and run selected actions" },
          { value: "full", label: "Full access within selected integrations and tools" },
        ]}
      />
      {access === "full" && (
        <Text size="sm" c="orange">
          Full access can allow arbitrary HTTP requests to selected integrations when that tool is selected.
        </Text>
      )}
      <Text size="sm" fw={600}>
        Integrations
      </Text>
      <ScrollArea.Autosize mah={180} type="auto">
        <Stack gap="xs">
          {integrations.map((integration) => (
            <Checkbox
              key={integration.id}
              label={`${integration.name} (${integration.kind})`}
              checked={integrationIds.includes(integration.id)}
              disabled={busy || loading}
              onChange={(event) => toggleIntegration(integration.id, event.currentTarget.checked)}
            />
          ))}
          {!loading && !integrations.length && (
            <Text size="sm" c="dimmed">
              Create an integration on this worker before approving MCP access.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
      <TextInput
        label="Tools"
        placeholder="Find a tool"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <Text size="xs" c="dimmed">
        Choose each tool you want to allow. Only worker-supported service tools are listed.
      </Text>
      <ScrollArea.Autosize mah={260} type="auto">
        <Stack gap="sm">
          {visibleTools.map((tool) => {
            const path = tool.pathInRouter.join(".");
            return (
              <Checkbox
                key={path}
                label={tool.name}
                description={tool.description}
                checked={procedurePaths.includes(path)}
                disabled={busy || loading}
                onChange={(event) => toggleTool(path, event.currentTarget.checked)}
              />
            );
          })}
          {!loading && !visibleTools.length && (
            <Text size="sm" c="dimmed">
              No tools match this permission and search.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
      <NativeSelect
        label="Access duration"
        value={duration}
        disabled={busy || loading}
        onChange={(event) => {
          setDuration(event.currentTarget.value);
          setConsent(false);
        }}
        data={[
          { value: "1", label: "1 hour" },
          { value: "24", label: "24 hours" },
          { value: "168", label: "7 days" },
        ]}
      />
      <Checkbox
        label="I allow the hosted MCP service to handle these tool arguments and results."
        checked={consent}
        disabled={busy || loading}
        onChange={(event) => setConsent(event.currentTarget.checked)}
      />
      <Text size="xs" c="dimmed">
        {integrationIds.length} integrations · {procedurePaths.length} tools selected
      </Text>
      <Button loading={busy || loading} disabled={!ready} onClick={() => void approve()}>
        Approve selected MCP access
      </Button>
      {mcpUrl && (
        <Group align="end" wrap="nowrap">
          <TextInput label="MCP server address" value={mcpUrl} readOnly style={{ flex: 1 }} />
          <Button variant="default" onClick={() => void copyAddress()}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </Group>
      )}
      {approvals.map((approval) => (
        <Paper key={approval.id} withBorder p="sm">
          <Group justify="space-between">
            <Stack gap={2}>
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  Hosted MCP
                </Text>
                <Badge size="xs" color={approval.active ? "green" : "gray"}>
                  {approval.active ? "Active" : "Inactive"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Expires {new Date(approval.expiresAt).toLocaleString()}
              </Text>
              {approval.service && (
                <Text size="xs">
                  {approval.service.integrationIds.length} integrations · {approval.service.procedurePaths.length} tools
                  · {approval.service.access}
                </Text>
              )}
            </Stack>
            {approval.active && (
              <Button variant="light" color="red" size="xs" disabled={busy} onClick={() => void revoke(approval)}>
                Revoke
              </Button>
            )}
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
