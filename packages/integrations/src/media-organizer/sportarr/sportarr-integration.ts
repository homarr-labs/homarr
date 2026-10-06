import { SonarrIntegration } from "../sonarr/sonarr-integration";

/**
 * Sportarr (https://github.com/Sportarr/Sportarr) is a sports event manager
 * exposing a Sonarr-v3-compatible API: calendar, queue and wanted/missing
 * behave like Sonarr's with leagues surfacing as series and events as
 * episodes. The Sonarr integration therefore drives it as-is; only the
 * link branding, web UI paths and calendar badge differ.
 */
export class SportarrIntegration extends SonarrIntegration {
  protected override get calendarLinkName(): string {
    return "Sportarr";
  }

  protected override get calendarLinkLogo(): string {
    return "/images/apps/sportarr.svg";
  }

  // Sportarr seasons are years ("S2026/E43" overflows the badge), and
  // the calendar already shows the date, so the season adds nothing.
  protected override getCalendarBadgeContent(_seasonNumber: number, episodeNumber: number): string {
    return `E${episodeNumber}`;
  }

  // Sportarr shows a league at /leagues/{id}. It has no slug route.
  protected override getSeriesPath(series: { id?: number; titleSlug: string }): `/${string}` {
    return series.id === undefined ? "/leagues" : `/leagues/${series.id}`;
  }

  // Sportarr shows its queue and missing events on the activity page.
  protected override get missingFallbackPath(): `/${string}` {
    return "/activity";
  }

  protected override get queueFallbackPath(): `/${string}` {
    return "/activity";
  }
}
