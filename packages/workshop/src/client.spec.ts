import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authWithOAuth2: vi.fn(),
  update: vi.fn(),
}));

vi.mock("pocketbase", () => {
  class MockPocketBase {
    public readonly authStore = {
      record: null as Record<string, unknown> | null,
      isValid: false,
      save: (_token: string, record: Record<string, unknown>) => {
        this.authStore.record = record;
      },
    };

    public collection() {
      return mocks;
    }
  }

  return {
    default: MockPocketBase,
    ClientResponseError: class ClientResponseError extends Error {},
  };
});

import { WorkshopClient } from "./client";

describe("WorkshopClient OAuth", () => {
  beforeEach(() => {
    mocks.authWithOAuth2.mockReset();
    mocks.update.mockReset();
  });

  test("lets PocketBase own the complete GitHub popup flow", async () => {
    mocks.authWithOAuth2.mockResolvedValue({
      token: "token",
      record: { id: "user-id" },
      meta: { username: "octocat" },
    });
    mocks.update.mockResolvedValue({ id: "user-id", displayName: "octocat" });

    const client = new WorkshopClient("https://workshop.example.com");
    await client.signInWithGitHub();

    expect(mocks.authWithOAuth2).toHaveBeenCalledWith({
      provider: "github",
      createData: { displayName: "GitHub user" },
    });
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("requestKey");
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("urlCallback");
  });
});
