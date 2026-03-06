import z from "zod";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { TimetableIntegration } from "../interfaces/timetable/timetable-integration";
import type { Stadion, Timetable, TimetableOptions } from "../interfaces/timetable/timetable-types";

const supportedStationTypes = ["bus", "tram", "train", "ship", "cablecar", "funicular", "chairlift"];

export class SearchChIntegration extends Integration implements TimetableIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/timetable/api/completion.json", { term: "Zürich" }));

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  /**
   * Searches for stations matching the given query.
   * @param query The search query for station names.
   * @returns A list of stations matching the search query.
   * @docs https://search.ch/fahrplan/api/help
   */
  public async searchStationsAsync(query: string): Promise<Stadion[]> {
    const response = await fetchWithTrustedCertificatesAsync(
      this.url("/timetable/api/completion.json", {
        term: query,
        show_ids: 1,
        nofavorites: 1,
      }),
    );

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await searchSchema.parseAsync(await response.json());

    return (
      data
        // Remove completions like addresses, we only want stations.
        .filter((item) => supportedStationTypes.some((type) => item.iconclass.endsWith(type)))
        .map((item) => (item.id !== undefined ? { id: item.id, name: item.label } : null))
        .filter((item) => item !== null)
    );
  }

  /**
   * Gets the departure timetable for a given station.
   * @param options Timetable options including station ID and limit.
   * @returns timetable for the given station.
   * @docs https://search.ch/fahrplan/api/help
   */
  public async getTimetableAsync(options: TimetableOptions): Promise<Timetable> {
    const now = new Date();
    // The following format is used [01.01.2000, 23:59:00]. The API allows usage of DD.MM.YYYY format and HH:mm format
    const [date, time] = now.toLocaleString("en-CH", { timeZone: "Europe/Zurich" }).split(", ") as [string, string];

    const response = await fetchWithTrustedCertificatesAsync(
      this.url("/timetable/api/stationboard.json", {
        stop: options.stationId,
        limit: options.limit,
        show_delays: 1,
        show_tracks: 1,
        date,
        time: time.substring(0, 5), // Only keep the HH:mm part of the time, as that's what the API expects
      }),
    );

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await timetableSchema.parseAsync(await response.json());

    return {
      stationId: options.stationId,
      timestamp: now,
      entries: data.connections.map((connection) => {
        // Color is in format A35~F10~ for foreground and background color. Some only have ~~ and therefore no color
        const color = connection.color.split("~")[0];

        return {
          timestamp: connection.time,
          line: connection.line
            ? {
                name: connection.line,
                color: color && color.length >= 1 ? `#${color}` : null,
              }
            : null,
          location: connection.terminal.name,
          delay: connection.dep_delay,
          platform: connection.track
            ? {
                // If the track name contains "!", it indicates a change in the track
                // so we remove the "!" from the name and set hasChanged to true
                name: connection.track.replace("!", ""),
                hasChanged: connection.track.includes("!"),
              }
            : null,
        };
      }),
    };
  }
}

const timetableSchema = z.object({
  connections: z.array(
    z.object({
      time: z.string().transform((str) => new Date(str)),
      line: z.string().optional(),
      color: z.string(),
      terminal: z.object({
        name: z.string(),
      }),
      track: z.string().optional(),
      dep_delay: z
        .string()
        .optional()
        .transform((str) => (str ? parseInt(str) : 0)),
    }),
  ),
});

const searchSchema = z.array(
  z.object({
    id: z.string().optional(),
    label: z.string(),
    iconclass: z.string(), // This is in format sl-icon-type-{type}
  }),
);
