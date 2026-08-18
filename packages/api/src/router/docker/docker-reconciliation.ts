import type { Database } from "@homarr/db";
import type { IntegrationKind } from "@homarr/definitions";
import {
  buildDockerServiceUrlCandidates,
  getIntegrationDefaultPort,
  matchDockerService,
  normalizeDockerServiceUrl,
} from "@homarr/definitions";
import { dockerContainersRequestHandler } from "@homarr/request-handler/docker";

export type DockerReconciliationState = "newRecognized" | "newApp" | "represented" | "linked" | "moved";
export type DockerReconciliationNextAction =
  | "setupIntegration"
  | "createApp"
  | "viewRepresentation"
  | "reviewIntegration";

export const getDockerReconciliationAsync = async (db: Database) => {
  const [{ data, timestamp }, integrations, apps] = await Promise.all([
    dockerContainersRequestHandler.handler({}).getDataAsync(),
    db.query.integrations.findMany({
      with: {
        items: { columns: { itemId: true } },
        secrets: { columns: { kind: true } },
      },
    }),
    db.query.apps.findMany(),
  ]);
  const normalizedIntegrations = integrations.map((integration) => ({
    integration,
    normalizedUrl: normalizeDockerServiceUrl(integration.url),
  }));
  const normalizedApps = apps.map((app) => ({ app, normalizedUrl: normalizeDockerServiceUrl(app.href) }));
  const containerNameCounts = new Map<string, number>();
  for (const container of data.containers) {
    const name = normalizeName(container.name);
    containerNameCounts.set(name, (containerNameCounts.get(name) ?? 0) + 1);
  }

  const candidates = data.containers.map((container) => {
    const match = matchDockerService(container);
    const urlCandidates = buildDockerServiceUrlCandidates({
      containerName: container.name,
      endpointHost: container.host,
      ports: container.ports,
      preferredPort: match ? getIntegrationDefaultPort(match.kind) : undefined,
    });
    const candidateUrls = new Set(
      urlCandidates.map(({ url }) => normalizeDockerServiceUrl(url)).filter((url) => url !== null),
    );
    const uniqueName = containerNameCounts.get(normalizeName(container.name)) === 1;
    const sameKindIntegrations = match
      ? normalizedIntegrations.filter(({ integration }) => integration.kind === match.kind)
      : [];
    const exactIntegrationMatches = sameKindIntegrations
      .filter(({ normalizedUrl }) => normalizedUrl !== null && candidateUrls.has(normalizedUrl))
      .map(({ integration }) => integration);
    const nameIntegrationMatches = uniqueName
      ? sameKindIntegrations
          .filter(({ integration }) => normalizeName(integration.name) === normalizeName(container.name))
          .map(({ integration }) => integration)
      : [];
    const exactIntegration = exactIntegrationMatches.length === 1 ? exactIntegrationMatches[0] : undefined;
    const nameIntegration =
      exactIntegrationMatches.length === 0 && nameIntegrationMatches.length === 1
        ? nameIntegrationMatches[0]
        : undefined;
    const integration = exactIntegration ?? nameIntegration;
    const exactAppMatches = normalizedApps
      .filter(({ normalizedUrl }) => normalizedUrl !== null && candidateUrls.has(normalizedUrl))
      .map(({ app }) => app);
    const nameAppMatches = uniqueName
      ? apps.filter(({ name }) => normalizeName(name) === normalizeName(container.name))
      : [];
    const exactApp = exactAppMatches.length === 1 ? exactAppMatches[0] : undefined;
    const nameApp = exactAppMatches.length === 0 && nameAppMatches.length === 1 ? nameAppMatches[0] : undefined;
    const linkedApp = integration?.appId ? apps.find(({ id }) => id === integration.appId) : undefined;
    const app = linkedApp ?? exactApp ?? nameApp;
    const exactUrl = Boolean(exactIntegration || exactApp);
    const linked = Boolean(integration?.appId && linkedApp);
    const integrationMoved = Boolean(integration && !exactIntegration);
    const integrationAmbiguous =
      exactIntegrationMatches.length > 1 || (exactIntegrationMatches.length === 0 && nameIntegrationMatches.length > 1);
    const appAmbiguous =
      !linkedApp && (exactAppMatches.length > 1 || (exactAppMatches.length === 0 && nameAppMatches.length > 1));
    const ambiguous = integrationAmbiguous || appAmbiguous;
    const state: DockerReconciliationState = integrationMoved
      ? "moved"
      : linked
        ? "linked"
        : integration || app
          ? "represented"
          : match
            ? "newRecognized"
            : "newApp";

    return {
      candidateKey: container.resourceId,
      endpointId: container.endpointId,
      endpointName: container.endpointName,
      nativeId: container.id,
      container,
      match,
      urlCandidates,
      state,
      nextAction: integrationAmbiguous
        ? ("reviewIntegration" as const)
        : appAmbiguous
          ? ("viewRepresentation" as const)
          : nextActionForState(state),
      representation: {
        integration: integration
          ? {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              url: integration.url,
              appId: integration.appId,
              itemCount: integration.items.length,
              configuredSecretKinds: integration.secrets.map(({ kind }) => kind),
            }
          : null,
        app: app ? { id: app.id, name: app.name, href: app.href } : null,
        signals: {
          exactUrl,
          exactIntegrationUrl: Boolean(exactIntegration),
          exactAppUrl: Boolean(exactApp),
          nameMatch: Boolean(nameIntegration || nameApp),
          linked,
          ambiguous,
        },
      },
    };
  });

  return { candidates, endpoints: data.endpoints, timestamp };
};

export const getDockerServiceHealthAsync = async (db: Database) => {
  const reconciliation = await getDockerReconciliationAsync(db);
  return {
    timestamp: reconciliation.timestamp,
    endpoints: reconciliation.endpoints.map((endpoint) => ({
      key: `endpoint:${endpoint.id}`,
      identity: { endpointId: endpoint.id, name: endpoint.name },
      layer: "docker" as const,
      status: endpoint.status,
      nextAction: endpoint.status === "unavailable" ? ("checkEndpoint" as const) : ("none" as const),
    })),
    services: reconciliation.candidates.map((candidate) => ({
      key: candidate.candidateKey,
      identity: {
        endpointId: candidate.endpointId,
        nativeId: candidate.nativeId,
        name: candidate.container.name,
        integration: candidate.representation.integration,
        app: candidate.representation.app,
      },
      layers: [
        { layer: "docker" as const, status: "available" as const, nextAction: "none" as const },
        {
          layer: "integrationConfiguration" as const,
          status: integrationHealthStatus(
            candidate.state,
            candidate.match?.kind,
            Boolean(candidate.representation.integration),
          ),
          nextAction:
            candidate.nextAction === "reviewIntegration"
              ? ("reviewIntegration" as const)
              : candidate.state === "newRecognized"
                ? ("setupIntegration" as const)
                : ("none" as const),
        },
        {
          layer: "authentication" as const,
          status: "notObserved" as const,
          nextAction: candidate.representation.integration
            ? ("testConnection" as const)
            : candidate.nextAction === "reviewIntegration"
              ? ("reviewIntegration" as const)
              : candidate.match
                ? ("setupIntegration" as const)
                : ("none" as const),
        },
        {
          layer: "apiRequest" as const,
          status: "notObserved" as const,
          nextAction: candidate.representation.integration
            ? ("openIntegrationDiagnostics" as const)
            : ("none" as const),
        },
        {
          layer: "appRepresentation" as const,
          status: candidate.representation.app ? ("linked" as const) : ("missing" as const),
          nextAction: candidate.representation.app
            ? ("none" as const)
            : candidate.representation.signals.ambiguous && candidate.nextAction === "viewRepresentation"
              ? ("viewRepresentation" as const)
              : ("createApp" as const),
        },
        {
          layer: "widgetConfiguration" as const,
          status: candidate.representation.integration
            ? candidate.representation.integration.itemCount > 0
              ? ("linked" as const)
              : ("unused" as const)
            : ("notApplicable" as const),
          nextAction:
            candidate.representation.integration && candidate.representation.integration.itemCount === 0
              ? ("addWidget" as const)
              : ("none" as const),
        },
        {
          layer: "widgetQuery" as const,
          status: "notObserved" as const,
          nextAction:
            candidate.representation.integration && candidate.representation.integration.itemCount > 0
              ? ("openBoard" as const)
              : ("none" as const),
        },
      ],
      status: candidate.state,
      nextAction: candidate.nextAction,
    })),
  };
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const nextActionForState = (state: DockerReconciliationState): DockerReconciliationNextAction => {
  if (state === "newRecognized") return "setupIntegration";
  if (state === "newApp") return "createApp";
  if (state === "moved") return "reviewIntegration";
  return "viewRepresentation";
};

const integrationHealthStatus = (
  state: DockerReconciliationState,
  kind: IntegrationKind | undefined,
  hasIntegration: boolean,
) => {
  if (!kind) return "notApplicable" as const;
  if (state === "moved") return "changed" as const;
  return hasIntegration ? ("configured" as const) : ("missing" as const);
};
