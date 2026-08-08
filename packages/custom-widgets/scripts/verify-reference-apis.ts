import { customJsxRequestSchema } from "../src/core/request-schema";
import { executeCustomWidgetRequest } from "../src/server/request-executor";
import { renderRequestTarget, resolveCustomWidgetRequestValues } from "../src/server/request-manifest";

const pokemonListRequest = customJsxRequestSchema.parse({
  path: "/api/v2/pokemon",
  query: { limit: { $option: "limit" }, offset: 0 },
});
const pokemonDetailRequest = customJsxRequestSchema.parse({
  path: "/api/v2/pokemon/{param:name}",
  trigger: "manual",
});

const listTarget = renderRequestTarget(
  "https://pokeapi.co",
  pokemonListRequest,
  resolveCustomWidgetRequestValues(pokemonListRequest, { limit: 3 }),
);
const list = await fetchJson(listTarget, {});
if (!isRecord(list) || !Array.isArray(list.results) || list.results.length !== 3) {
  throw new Error("PokeAPI list response did not match the expected shape");
}
const firstName = isRecord(list.results[0]) && typeof list.results[0].name === "string" ? list.results[0].name : null;
if (!firstName) throw new Error("PokeAPI list did not contain a Pokémon name");
const detailTarget = renderRequestTarget(
  "https://pokeapi.co",
  pokemonDetailRequest,
  resolveCustomWidgetRequestValues(pokemonDetailRequest, {}, { name: firstName }),
);
const detail = await fetchJson(detailTarget, {});
if (!isRecord(detail) || detail.name !== firstName || !Array.isArray(detail.stats)) {
  throw new Error("PokeAPI detail response did not match the expected shape");
}
process.stdout.write("PokeAPI list and detail requests passed\n");

const portainerBaseUrl = process.env.PORTAINER_BASE_URL;
const portainerApiKey = process.env.PORTAINER_API_KEY;
if (!portainerBaseUrl || !portainerApiKey) {
  if (process.argv.includes("--pokeapi-only")) {
    process.stdout.write("Portainer check skipped (--pokeapi-only)\n");
    process.exit(0);
  }
  throw new Error("PORTAINER_BASE_URL and PORTAINER_API_KEY are required for the Portainer reference check");
}
const endpointId = process.env.PORTAINER_ENDPOINT_ID ?? "2";
const containersRequest = customJsxRequestSchema.parse({
  path: "/api/endpoints/{option:endpointId}/docker/containers/json",
  query: { all: true },
});
const containersTarget = renderRequestTarget(
  portainerBaseUrl,
  containersRequest,
  resolveCustomWidgetRequestValues(containersRequest, { endpointId }),
);
const containers = await fetchJson(containersTarget, { "X-API-Key": portainerApiKey });
if (!Array.isArray(containers)) throw new Error("Portainer containers response was not an array");

const actionRequests = ["start", "stop", "restart"].map((action) =>
  customJsxRequestSchema.parse({
    kind: "action",
    method: "POST",
    path: `/api/endpoints/{option:endpointId}/docker/containers/{param:id}/${action}`,
    confirmation: `${action} this container?`,
    invalidates: ["containers"],
  }),
);
for (const request of actionRequests) {
  const target = renderRequestTarget(
    portainerBaseUrl,
    request,
    resolveCustomWidgetRequestValues(request, { endpointId }, { id: "container/id" }),
  );
  if (!target.pathname.includes("container%2Fid")) throw new Error("Portainer action target did not encode its ID");
}
process.stdout.write(
  `Portainer container query passed (${containers.length} containers); start/stop/restart targets passed\n`,
);

const mutationContainerId = process.env.PORTAINER_TEST_CONTAINER_ID;
if (mutationContainerId) {
  if (process.env.PORTAINER_ALLOW_MUTATIONS !== "1") {
    throw new Error("Set PORTAINER_ALLOW_MUTATIONS=1 to test actions against PORTAINER_TEST_CONTAINER_ID");
  }
  const container = containers.find(
    (candidate) =>
      isRecord(candidate) && (candidate.Id === mutationContainerId || candidate.ID === mutationContainerId),
  );
  if (!isRecord(container)) throw new Error("PORTAINER_TEST_CONTAINER_ID was not returned by the container query");
  const initiallyRunning =
    container.State === "running" || (isRecord(container.State) && container.State.Running === true);
  const actionOrder = initiallyRunning ? ["restart", "stop", "start"] : ["start", "restart", "stop"];
  try {
    for (const action of actionOrder) await runPortainerAction(action, mutationContainerId);
  } finally {
    await runPortainerAction(initiallyRunning ? "start" : "stop", mutationContainerId, true);
  }
  process.stdout.write(
    `Portainer ${actionOrder.join("/")} actions passed and the original running state was restored\n`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchJson(target: URL, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(target, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Reference API returned HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function runPortainerAction(action: string, containerId: string, ignoreConflict = false) {
  const request = customJsxRequestSchema.parse({
    kind: "action",
    method: "POST",
    path: `/api/endpoints/{option:endpointId}/docker/containers/{param:id}/${action}`,
  });
  const target = renderRequestTarget(
    portainerBaseUrl,
    request,
    resolveCustomWidgetRequestValues(request, { endpointId }, { id: containerId }),
  );
  const response = await executeCustomWidgetRequest({
    baseUrl: portainerBaseUrl,
    targetUrl: target,
    method: "POST",
    networkScope: "private",
    kind: "action",
    auth: {
      type: "apiKeyHeader",
      headerName: "X-API-Key",
      secrets: [{ kind: "apiKey", value: portainerApiKey }],
    },
  });
  if (!response.ok && !(ignoreConflict && response.status === 304)) {
    throw new Error(`Portainer ${action} returned HTTP ${response.status}`);
  }
}
