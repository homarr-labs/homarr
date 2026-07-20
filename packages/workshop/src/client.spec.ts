import { describe, expect, test, vi } from "vitest";

import { WorkshopClient } from "./client";

describe("Workshop deletion", () => {
  const cases: Array<{
    label: string;
    action: (client: WorkshopClient) => Promise<void>;
    collection: string;
    id: string;
  }> = [
    {
      label: "submission",
      action: (client) => client.delete("submission-id"),
      collection: "submissions",
      id: "submission-id",
    },
    { label: "report", action: (client) => client.dismissReport("report-id"), collection: "reports", id: "report-id" },
  ];

  test.each(cases)("deletes $label records through PocketBase", async ({ action, collection: collectionName, id }) => {
    const client = new WorkshopClient("https://workshop.example.com");
    const deleteRecord = vi.fn().mockResolvedValue(true);
    const collection = vi.spyOn(client.pocketBase, "collection").mockReturnValue({ delete: deleteRecord } as never);

    await action(client);

    expect(collection).toHaveBeenCalledWith(collectionName);
    expect(deleteRecord).toHaveBeenCalledWith(id);
  });
});
