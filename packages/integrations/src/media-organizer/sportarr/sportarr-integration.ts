import { SonarrIntegration } from "../sonarr/sonarr-integration";

/**
 * Sportarr (https://github.com/Sportarr/Sportarr) is a sports event manager
 * exposing a Sonarr-v3-compatible API: calendar, queue and wanted/missing
 * behave like Sonarr's with leagues surfacing as series and events as
 * episodes. The Sonarr integration therefore drives it as-is; only the
 * calendar link branding differs.
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
}
