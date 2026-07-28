import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  autoCancellation: vi.fn(),
  authWithOAuth2: vi.fn(),
  create: vi.fn(),
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
import * as workshopClient from "./client";

describe("WorkshopBackend", () => {
  test("resolves the advertised client module", () => {
    expect(workshopClient.WorkshopBackend).toBe(WorkshopBackend);
    expect(workshopClient.validateWorkshopContent).toBeTypeOf("function");
  });

  beforeEach(() => {
    mocks.autoCancellation.mockReset();
    mocks.authWithOAuth2.mockReset();
    mocks.create.mockReset();
    mocks.getFullList.mockReset();
    mocks.getList.mockReset();
    mocks.update.mockReset();
  });

  test("lets PocketBase own the complete GitHub popup flow", async () => {
    mocks.authWithOAuth2.mockResolvedValue({
      token: "token",
      record: {
        id: "user-id",
        displayName: "octocat",
        githubUsername: "octocat",
        githubProfileUrl: "https://github.com/octocat",
      },
      meta: { username: "octocat" },
    });

    const client = new WorkshopBackend("https://workshop.example.com");
    const user = await client.signInWithGitHub();

    expect(mocks.authWithOAuth2).toHaveBeenCalledWith({
      provider: "github",
      createData: { displayName: "GitHub user" },
    });
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("requestKey");
    expect(mocks.authWithOAuth2.mock.calls[0]?.[0]).not.toHaveProperty("urlCallback");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(user).toMatchObject({ displayName: "octocat", githubUsername: "octocat" });
  });

  test("exposes the typed submission collection service", () => {
    const client = new WorkshopBackend("https://workshop.example.com");
    expectTypeOf(client.pocketBase.collection("submissions")).toEqualTypeOf<RecordService<WorkshopSubmissionRecord>>();
    expect(mocks.autoCancellation).toHaveBeenCalledWith(false);
  });

  test("sends the exported schema while leaving initial revision ownership to PocketBase", async () => {
    const client = new WorkshopBackend("https://workshop.example.com");
    client.pocketBase.authStore.save("token", { id: "author-id" } as never);
    mocks.create.mockResolvedValue({ id: "submission-id" });
    vi.spyOn(client, "get").mockResolvedValue(listingRecord() as never);

    await client.create({
      type: "customCss",
      title: "Dashboard theme",
      description: "A theme",
      content: ".dashboard { color: red; }",
      changelog: "",
      outdated: false,
    });

    const payload = mocks.create.mock.calls[0]?.[0] as FormData;
    expect(payload.get("author")).toBe("author-id");
    expect(payload.get("widgetSchema")).toBe("homarr-custom-css-v1");
    expect(payload.get("revision")).toBeNull();
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
        expectedRevision: 2,
      }),
    );
    const payload = mocks.update.mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty("revision");
    expect(payload).not.toHaveProperty("widgetSchema");
  });

  test("uses the current revision when toggling submission status", async () => {
    const client = new WorkshopBackend("https://workshop.example.com");
    const current = {
      ...listingRecord(),
      type: "customCss" as const,
      content: ".dashboard { color: red; }",
      revision: 4,
      outdated: false,
    };
    const updated = { ...current, revision: 5, outdated: true };
    vi.spyOn(client, "get")
      .mockResolvedValueOnce(current as never)
      .mockResolvedValueOnce(updated as never);
    mocks.update.mockResolvedValue(updated);

    await expect(client.toggleOutdated(current.id, true)).resolves.toMatchObject({
      revision: 5,
      outdated: true,
    });
    expect(mocks.update).toHaveBeenCalledWith(current.id, {
      outdated: true,
      expectedRevision: 4,
    });
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
