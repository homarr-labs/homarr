import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  autoCancellation: vi.fn(),
  authWithOAuth2: vi.fn(),
  getFullList: vi.fn(),
  getList: vi.fn(),
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

    public autoCancellation(enabled: boolean) {
      mocks.autoCancellation(enabled);
      return this;
    }

    public filter(template: string, values: Record<string, string>) {
      return template.replaceAll(/\{:(\w+)\}/gu, (_match, key: string) => `'${values[key]}'`);
    }
  }

  return {
    default: MockPocketBase,
    ClientResponseError: class ClientResponseError extends Error {
      public constructor(public readonly status = 0) {
        super("PocketBase request failed");
      }
    },
  };
});

import { ClientResponseError } from "pocketbase";
import type { RecordService } from "pocketbase";

import { WorkshopBackend } from "./backend";
import type { WorkshopSubmissionRecord } from "./backend";

describe("WorkshopBackend", () => {
  beforeEach(() => {
    mocks.autoCancellation.mockReset();
    mocks.authWithOAuth2.mockReset();
    mocks.getFullList.mockReset();
    mocks.getList.mockReset();
    mocks.update.mockReset();
  });

  test("lets PocketBase own the complete GitHub popup flow", async () => {
    mocks.authWithOAuth2.mockResolvedValue({
      token: "token",
      record: { id: "user-id" },
      meta: { username: "octocat" },
    });
    mocks.update.mockResolvedValue({ id: "user-id", displayName: "octocat" });

    const client = new WorkshopBackend("https://workshop.example.com");
    await client.signInWithGitHub();

    expect(mocks.authWithOAuth2).toHaveBeenCalledWith({
      provider: "github",
      createData: { displayName: "GitHub user" },
    });
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("requestKey");
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("urlCallback");
  });

  test("exposes the typed submission collection service", () => {
    const client = new WorkshopBackend("https://workshop.example.com");
    expectTypeOf(client.pocketBase.collection("submissions")).toEqualTypeOf<RecordService<WorkshopSubmissionRecord>>();
    expect(mocks.autoCancellation).toHaveBeenCalledWith(false);
  });

  test("appends and removes screenshots without replacing retained files", async () => {
    const client = new WorkshopBackend("https://workshop.example.com");
    const current = {
      ...listingRecord(),
      type: "customCss" as const,
      content: ".dashboard { color: red; }",
      screenshots: ["keep.png", "remove.png"],
      revision: 2,
    };
    vi.spyOn(client, "get").mockResolvedValue(current as never);
    mocks.update.mockResolvedValue(current);
    const addition = new File(["image"], "new.png", { type: "image/png" });

    await client.update(
      current.id,
      {
        type: "customCss",
        title: current.title,
        description: current.description,
        content: current.content,
        changelog: "Updated screenshots",
        outdated: false,
      },
      { additions: [addition], removals: ["remove.png"] },
    );

    expect(mocks.update).toHaveBeenCalledWith(
      current.id,
      expect.objectContaining({
        "screenshots+": [addition],
        "screenshots-": ["remove.png"],
        revision: 3,
      }),
    );
  });

  test("uses PocketBase filtering and pagination when the listing view is current", async () => {
    mocks.getList.mockResolvedValue({
      page: 1,
      perPage: 12,
      totalPages: 1,
      totalItems: 1,
      items: [listingRecord()],
    });

    const client = new WorkshopBackend("https://workshop.example.com");
    const result = await client.list({ type: "customWidget", sort: "top", page: 1, perPage: 12 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ type: "customWidget", score: 0, revision: 1 });
    expect(mocks.getList).toHaveBeenCalledWith(
      1,
      12,
      expect.objectContaining({ filter: "type = 'customWidget'", sort: "-score,-created" }),
    );
    expect(mocks.getFullList).not.toHaveBeenCalled();
  });

  test("searches listing titles, descriptions, and authors", async () => {
    mocks.getList.mockResolvedValue({
      page: 1,
      perPage: 12,
      totalPages: 1,
      totalItems: 1,
      items: [listingRecord()],
    });

    const client = new WorkshopBackend("https://workshop.example.com");
    await client.list({ search: "active streams", page: 1, perPage: 12 });

    expect(mocks.getList).toHaveBeenCalledWith(
      1,
      12,
      expect.objectContaining({
        filter: "(title ~ 'active streams' || description ~ 'active streams' || authorName ~ 'active streams')",
      }),
    );
  });

  test("retries an incomplete listing view without missing-field filters", async () => {
    mocks.getList.mockRejectedValueOnce(new ClientResponseError(400));
    mocks.getFullList.mockResolvedValueOnce([listingRecord()]);

    const client = new WorkshopBackend("https://workshop.example.com");
    const result = await client.list({ type: "customWidget" });

    expect(result.items).toHaveLength(1);
    expect(mocks.getFullList).toHaveBeenCalledWith(
      expect.not.objectContaining({ filter: expect.anything(), sort: expect.anything() }),
    );
  });

  test("falls back to base submissions when an old listing view itself returns 400", async () => {
    mocks.getList.mockRejectedValueOnce(new ClientResponseError(400));
    mocks.getFullList.mockRejectedValueOnce(new ClientResponseError(400)).mockResolvedValueOnce([listingRecord()]);

    const client = new WorkshopBackend("https://workshop.example.com");
    const result = await client.list({ type: "customWidget" });

    expect(result.items).toHaveLength(1);
    expect(mocks.getFullList).toHaveBeenCalledTimes(2);
  });
});

function listingRecord() {
  return {
    id: "submission-id",
    title: "Tautulli Activity",
    description: "Shows active streams",
    widgetSchema: "homarr-custom-widget-v2",
    screenshots: [],
    author: "author-id",
    created: "2026-07-21 14:19:25.790Z",
    updated: "2026-07-21 14:19:25.790Z",
  };
}
