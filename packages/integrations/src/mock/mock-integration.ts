import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IMediaReleasesIntegration, MediaRelease } from "../types";
import { mockMediaReleases } from "./data/media-releases";

export class MockIntegration extends Integration implements IMediaReleasesIntegration {
  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    return await Promise.resolve({
      success: true,
    });
  }

  public async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    return await Promise.resolve(mockMediaReleases);
  }
}
