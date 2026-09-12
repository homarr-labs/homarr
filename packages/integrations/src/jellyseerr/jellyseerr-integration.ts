import type { IntegrationHttpAuthentication } from "../http-auth";
import { apiKeyAuth } from "../http-auth";
import type { MediaAvailability } from "../interfaces/media-requests/media-request-types";
import { UpstreamMediaAvailability } from "../interfaces/media-requests/media-request-types";
import { OverseerrIntegration } from "../overseerr/overseerr-integration";

export class JellyseerrIntegration extends OverseerrIntegration {
  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return apiKeyAuth(this.integration);
  }

  protected override mapAvailability(availability: UpstreamMediaAvailability, inProgress: boolean): MediaAvailability {
    // Availability statuses are not exactly the same between Jellyseerr and Overseerr (Jellyseerr has "blacklisted" additionally (deleted is the same value in overseerr))
    if (availability === UpstreamMediaAvailability.JellyseerrBlacklistedOrOverseerrDeleted) return "blacklisted";
    if (availability === UpstreamMediaAvailability.JellyseerrDeleted) return "deleted";
    return super.mapAvailability(availability, inProgress);
  }
}
