// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { NextResponse } from "next/server";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("@homarr/common/env", () => ({ env: { SECRET_ENCRYPTION_KEY: "1".repeat(64) } }));
vi.mock("~/board-preparation/lookup", () => ({ lookupPreparedBoardResponseAsync: lookup }));

import { createPreparationHeaders } from "@homarr/cron-jobs/board-preparation";
import { GET } from "./route";

const path = "/api/board-preparation/lookup?pathname=%2Fboards%2Fdefault&rewrite=%2Fen%2Fboards%2Fdefault";
afterEach(() => lookup.mockReset());

test("rejects unsigned requests without reading private board data", async () => {
  expect((await GET(new Request("http://localhost" + path))).status).toBe(404);
  expect(lookup).not.toHaveBeenCalled();
});

test("rejects a signature copied from a different lookup target", async () => {
  const headers = createPreparationHeaders("GET", path);
  expect((await GET(new Request("http://localhost" + path + "x", { headers }))).status).toBe(404);
  expect(lookup).not.toHaveBeenCalled();
});

test("passes the current viewer cookie and document path to the authorized lookup", async () => {
  lookup.mockResolvedValue(new NextResponse("private HTML", { headers: { "X-Homarr-Board-Cache": "HIT; age=1" } }));
  const response = await GET(
    new Request("http://localhost" + path, {
      headers: { ...createPreparationHeaders("GET", path), cookie: "homarr.session-token=viewer" },
    }),
  );
  const document = lookup.mock.calls[0]?.[0] as Request;
  expect(new URL(document.url).pathname).toBe("/boards/default");
  expect(document.headers.get("cookie")).toBe("homarr.session-token=viewer");
  expect(await response.text()).toBe("private HTML");
});
