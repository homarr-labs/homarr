import { Integration } from "../base/integration";

export class SonarrIntegration extends Integration {
  /**
   * Gets the events in the Sonarr calendar between two dates.
   * @param start The start date
   * @param end The end date
   * @param includeUnmonitored When true results will include unmonitored items of the Sonarr library.
   */
  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<any[]> {
    // TODO: use type here
    const url = new URL(this.integration.url);
    url.pathname = "/api/v3/calendar";
    url.searchParams.append("apiKey", super.getSecretValue("apiKey"));
    url.searchParams.append("start", start.toISOString());
    url.searchParams.append("end", end.toISOString());
    url.searchParams.append("includeSeries", "true");
    url.searchParams.append("includeEpisodeFile", "true");
    url.searchParams.append("includeEpisodeImages", "true");
    url.searchParams.append("unmonitored", includeUnmonitored ? 'true' : 'false');
    const response = await fetch(url);
    const json = await response.json();
  }
}
