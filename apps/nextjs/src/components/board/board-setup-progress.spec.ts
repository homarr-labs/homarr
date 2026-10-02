import { describe, expect, test } from "vitest";

import { getBoardSetupProgress } from "./board-setup-progress";

describe("getBoardSetupProgress", () => {
  test("derives resumable progress from the board and connected services", () => {
    expect(getBoardSetupProgress({ itemKinds: ["clock", "app"], usableIntegrationCount: 1 })).toEqual({
      steps: { content: true, app: true, service: true },
      completedCount: 3,
      totalCount: 3,
      isComplete: true,
    });
  });

  test("does not count an app as a data widget", () => {
    expect(getBoardSetupProgress({ itemKinds: ["app"], usableIntegrationCount: 0 })).toMatchObject({
      steps: { content: false, app: true, service: false },
      completedCount: 1,
      isComplete: false,
    });
  });
});
