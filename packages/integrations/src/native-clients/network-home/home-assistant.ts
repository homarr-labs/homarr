import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { calendarEventSchema, calendarsSchema, entityStateSchema } from "../../homeassistant/homeassistant-types";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";
import { NetworkHomeProtocol, settleNetworkHomeAsync } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class HomeAssistantProtocol extends NetworkHomeProtocol {
  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.authHeaders() };
  }

  async getEntityStatsAsync() {
    return this.runAsync((http) =>
      http.responseAsync(this.url("/api/states"), { headers: this.authHeaders() }, async (response) => {
        if (!response.ok) throw new ResponseError(response);
        const entities = z.array(z.object({ entity_id: z.string(), state: z.string() })).parse(await response.json());
        return {
          entities: entities.length,
          unavailable: entities.filter((entity) => entity.state === "unavailable").length,
          lightsOn: entities.filter((entity) => entity.entity_id.startsWith("light.") && entity.state === "on").length,
          peopleHome: entities.filter((entity) => entity.entity_id.startsWith("person.") && entity.state === "home")
            .length,
        };
      }),
    );
  }

  async getEntityStateAsync(entityId: string) {
    try {
      return await this.runAsync((http) =>
        http.responseAsync(this.url(`/api/states/${entityId}`), { headers: this.authHeaders() }, async (response) => {
          const body = await response.json();
          if (!response.ok) {
            this.resources.log?.write("warn", "Response did not indicate success", {});
            return { success: false, error: "Response did not indicate success" } satisfies {
              success: false;
              error: string;
            };
          }
          return entityStateSchema.safeParseAsync(body);
        }),
      );
    } catch (error) {
      this.rethrowProtectedFailure(error);
      this.resources.log?.write("error", "Failed to fetch entity state", { entityId });
      return { success: false, error } satisfies { success: false; error: unknown };
    }
  }

  async triggerAutomationAsync(entityId: string): Promise<boolean> {
    this.requireInteract();
    return this.triggerCandidateAsync("/api/services/automation/trigger", entityId, "Failed to trigger automation");
  }

  async triggerToggleAsync(entityId: string): Promise<boolean> {
    this.requireInteract();
    return this.triggerCandidateAsync("/api/services/homeassistant/toggle", entityId, "Failed to toggle entity");
  }

  async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const headers = this.authHeaders();
      const calendars = await http.responseAsync(this.url("/api/calendars"), { headers }, async (response) => {
        if (!response.ok) throw new ResponseError(response);
        return calendarsSchema.parseAsync(await response.json());
      });
      const events = await settleNetworkHomeAsync(
        calendars.map((calendar) =>
          http.responseAsync(
            this.url(`/api/calendars/${calendar.entity_id}`, { start, end }),
            { headers },
            async (response) => {
              if (!response.ok) throw new ResponseError(response);
              return z.array(calendarEventSchema).parseAsync(await response.json());
            },
          ),
        ),
      );
      return events.flat().map((event) => ({
        title: event.summary,
        subTitle: null,
        description: event.description,
        startDate: "date" in event.start ? new Date(`${event.start.date}T00:00:00`) : new Date(event.start.dateTime),
        endDate: "date" in event.end ? new Date(`${event.end.date}T00:00:00`) : new Date(event.end.dateTime),
        image: null,
        indicatorColor: "#18bcf2",
        links: [],
        location: event.location,
      }));
    });
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(this.url("/api/config"), { headers: this.authHeaders() }, async (response) =>
      response.ok ? { success: true } : TestConnectionError.StatusResult(response),
    );
  }

  private async triggerCandidateAsync(path: `/api/${string}`, entityId: string, event: string): Promise<boolean> {
    try {
      return await this.runAsync((http) =>
        http.responseAsync(
          this.url(path),
          {
            headers: { ...this.authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ entity_id: entityId }),
            method: "POST",
          },
          async (response) => response.ok,
        ),
      );
    } catch (error) {
      this.rethrowProtectedFailure(error);
      this.resources.log?.write("error", event, { entityId });
      return false;
    }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.secret("apiKey")}` };
  }
}
