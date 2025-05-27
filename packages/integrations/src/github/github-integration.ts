import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ProviderIntegration} from "../interfaces/providers/providers-integration";
import type { Repository, ReleaseResponse} from "../interfaces/providers/providers-types";

// TODO: Check integrations errors
@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
export class GithubIntegration extends Integration implements ProviderIntegration {

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const apiKey = this.getSecretValue("tokenId");
    const response = await input.fetchAsync(this.url("/octocat"), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
  }

  public async getReleasesAsync(repositories: Repository[]): Promise<ReleaseResponse[]> {
    // const api = await this.getApiAsync();
    // const sessionApi = getSessionApi(api);
    // const sessions = await sessionApi.getSessions();

    // return sessions.data
    //   .filter((sessionInfo) => sessionInfo.UserId !== undefined)
    //   .filter((sessionInfo) => sessionInfo.DeviceId !== "homarr")
    //   .filter((sessionInfo) => !options.showOnlyPlaying || sessionInfo.NowPlayingItem !== undefined)
    //   .map((sessionInfo): StreamSession => {
    //     let currentlyPlaying: StreamSession["currentlyPlaying"] | null = null;

    //     if (sessionInfo.NowPlayingItem) {
    //       currentlyPlaying = {
    //         type: convertJellyfinType(sessionInfo.NowPlayingItem.Type),
    //         name: sessionInfo.NowPlayingItem.SeriesName ?? sessionInfo.NowPlayingItem.Name ?? "",
    //         seasonName: sessionInfo.NowPlayingItem.SeasonName ?? "",
    //         episodeName: sessionInfo.NowPlayingItem.EpisodeTitle,
    //         albumName: sessionInfo.NowPlayingItem.Album ?? "",
    //         episodeCount: sessionInfo.NowPlayingItem.EpisodeCount,
    //       };
    //     }

    //     return {
    //       sessionId: `${sessionInfo.Id}`,
    //       sessionName: `${sessionInfo.Client} (${sessionInfo.DeviceName})`,
    //       user: {
    //         profilePictureUrl: this.url(`/Users/${sessionInfo.UserId}/Images/Primary`).toString(),
    //         userId: sessionInfo.UserId ?? "",
    //         username: sessionInfo.UserName ?? "",
    //       },
    //       currentlyPlaying,
    //     };
    //   });
    return [];
  }
}
