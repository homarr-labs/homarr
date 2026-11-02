import type {
  CustomJsxRuntimeParams,
  CustomWidgetRequestResult,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "@homarr/custom-widgets/runtime";

import type { ArenaState } from "./_arena-contract";
import type { BlindDataset } from "./_review";

export const runtimeMessages: CustomWidgetRuntimeMessages = {
  requestIdRequired: "Request unavailable",
  unsavedPreview: "Simulated data",
  invalidParams: "Invalid simulated input",
  loadRequest: "Load simulated data",
  requestFailed: "Simulated request failed",
  loading: "Loading simulated data",
  retry: "Retry",
  widgetItemUnavailable: "Simulation unavailable",
  actionsDisabledEditMode: "Simulation unavailable",
  actionSimulated: "Action simulated locally",
  actionCompleted: "Action simulated locally",
  confirmDelete: "Simulate this action? No live service will be changed.",
  toggle: "Toggle simulation",
  refresh: "Refresh simulated data",
};

export function fixtureResult(
  fixture: BlindDataset["cases"][number],
  state: ArenaState,
  requestId: string,
  params: CustomJsxRuntimeParams = {},
): CustomWidgetRequestResult {
  const responses = state === "empty" ? fixture.emptyResponses : fixture.responses;
  if (!Object.hasOwn(responses, requestId)) {
    return { ok: false, status: 404, data: null, error: "Simulated request unavailable", simulated: true };
  }
  if (state === "error")
    return { ok: false, status: 503, data: null, error: "Simulated request failed", simulated: true };
  const data = filterResponse(fixture, state, requestId, params);
  return { ok: true, status: 200, data, simulated: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterResponse(
  fixture: BlindDataset["cases"][number],
  state: ArenaState,
  requestId: string,
  params: CustomJsxRuntimeParams,
) {
  const responses = state === "empty" ? fixture.emptyResponses : fixture.responses;
  const result: unknown = structuredClone(responses[requestId]);
  const rows = (source: unknown, key: string) => {
    if (!isRecord(source) || !Array.isArray(source[key])) return [];
    return source[key].filter(isRecord);
  };
  if (fixture.id === "sonarr" && ["episodes", "episodesForDay"].includes(requestId)) {
    const episodes = rows(responses.episodes, "episodes").filter((episode) => {
      if (typeof episode.airDate !== "string") return false;
      const day = episode.airDate.slice(0, 10);
      if (requestId === "episodesForDay") return day === params.day;
      return day >= String(fixture.defaultOptions.start) && day <= String(fixture.defaultOptions.end);
    });
    return { episodes };
  }
  if (fixture.id === "event-feed" && requestId === "filteredEvents") {
    const source = responses.events;
    const events = rows(source, "events").filter(
      (event) => params.category === "all" || event.category === params.category,
    );
    return { events, now: fixture.simulation.clock };
  }
  if (fixture.id === "ha-cameras" && requestId === "cameras") {
    const selected = String(fixture.defaultOptions.cameraIds)
      .split(",")
      .map((id) => id.trim());
    return { cameras: rows(result, "cameras").filter((camera) => selected.includes(String(camera.id))) };
  }
  if (fixture.id === "ntfy" && requestId === "notifications") {
    return { messages: rows(result, "messages").filter((message) => message.topic === fixture.defaultOptions.topic) };
  }
  return result;
}

export function createSimulationPort({
  fixture,
  state,
  invalidate,
  notify,
  confirm,
}: {
  fixture: BlindDataset["cases"][number];
  state: ArenaState;
  invalidate(): Promise<void>;
  notify(message: string): void;
  confirm(): Promise<boolean>;
}): CustomWidgetRuntimePort {
  return {
    async query(input, signal) {
      if (state === "loading") {
        return new Promise<CustomWidgetRequestResult>((_resolve, reject) => {
          if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
          signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        });
      }
      return fixtureResult(fixture, state, input.requestId, input.params);
    },
    async executeAction(input) {
      return fixtureResult(fixture, state, input.requestId);
    },
    invalidate,
    confirm,
    notify() {
      notify("Action simulated locally. No live service was changed.");
    },
  };
}
