// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, expect, test, vi } from "vitest";

import type * as Frameleaf from "@homarr/integrations/frameleaf";

import type { FrameleafState } from "../../../../../../../../packages/integrations/src/frameleaf/connection";

import { GET } from "./route";

const fixture = vi.hoisted(() => ({
  value: null as FrameleafState | null,
  replacement: null as FrameleafState | null,
  userId: "alice",
  sessionId: "session",
  callback: "https://homarr.example.test/api/integrations/frameleaf/callback",
  setCookie: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [{ value: "integration" }], set: fixture.setCookie }),
}));
vi.mock("@homarr/db", () => ({ db: {} }));
vi.mock("@homarr/integrations/frameleaf", async () => {
  const actual = await vi.importActual<typeof Frameleaf>("@homarr/integrations/frameleaf");
  return {
    ...actual,
    FrameleafDatabaseStore: class {
      async readAsync() {
        return structuredClone(fixture.value);
      }
      async replaceAsync(previous: FrameleafState | null, next: FrameleafState | null) {
        if (fixture.replacement) fixture.value = fixture.replacement;
        if (JSON.stringify(fixture.value) !== JSON.stringify(previous)) return false;
        fixture.value = structuredClone(next);
        return true;
      }
    },
  };
});
vi.mock("../_access", () => ({
  frameleafCookie: "pending-cookie",
  frameleafResponseHeaders: { "Cache-Control": "no-store" },
  frameleafCallback: () => fixture.callback,
  requireFrameleafManagementAsync: async () => ({
    session: { user: { id: fixture.userId } },
    token: fixture.sessionId,
  }),
}));
const callback = "https://homarr.example.test/api/integrations/frameleaf/callback";
const digest = (value: string) => createHash("sha256").update(value).digest("base64url");
beforeEach(() => {
  fixture.value = {
    version: 1,
    origin: "https://library.example.test",
    clientId: "client",
    status: "pending",
    pending: {
      stateHash: digest("state"),
      sessionHash: digest("session"),
      userId: "alice",
      verifier: "verifier",
      callback,
      expiresAt: Date.now() + 300000,
    },
  };
  fixture.replacement = null;
  fixture.userId = "alice";
  fixture.sessionId = "session";
  fixture.callback = callback;
  fixture.setCookie.mockReset();
});
test("a bound denied consent clears that attempt and cookie, then rejects replay", async () => {
  const request = new Request(`${callback}?error=access_denied&state=state`);
  const response = await GET(request);
  expect(response.headers.get("location")).toBe("/manage/integrations/edit/integration?frameleaf=consent");
  expect(fixture.value).toBeNull();
  expect(fixture.setCookie).toHaveBeenCalledTimes(1);
  fixture.setCookie.mockClear();
  await GET(request);
  expect(fixture.setCookie).not.toHaveBeenCalled();
});
test.each([
  "error=access_denied&state=wrong",
  "error=access_denied",
  "error=access_denied&state=state&state=state",
  "error=access_denied&error=access_denied&state=state",
  "error=access_denied&state=state&code=code",
])("invalid callback %s cannot clear an attempt or its cookie", async (query) => {
  const previous = structuredClone(fixture.value);
  await GET(new Request(`${callback}?${query}`));
  expect(fixture.value).toEqual(previous);
  expect(fixture.setCookie).not.toHaveBeenCalled();
});
test.each(["user", "session", "callback", "expired", "exchanging"])(
  "denied consent cannot cancel a mismatched %s binding",
  async (binding) => {
    if (binding === "user") fixture.userId = "bob";
    if (binding === "session") fixture.sessionId = "other-session";
    if (binding === "callback") fixture.callback = callback.replace("homarr.example.test", "other.example.test");
    if (fixture.value && "pending" in fixture.value) {
      if (binding === "expired") fixture.value.pending.expiresAt = 0;
      if (binding === "exchanging") fixture.value.status = "exchanging";
    }
    const previous = structuredClone(fixture.value);
    await GET(new Request(`${callback}?error=access_denied&state=state`));
    expect(fixture.value).toEqual(previous);
    expect(fixture.setCookie).not.toHaveBeenCalled();
  },
);
test("denied consent loses its CAS safely when a newer attempt wins", async () => {
  fixture.replacement = structuredClone(fixture.value);
  if (!fixture.replacement || !("pending" in fixture.replacement)) throw new Error("Missing fixture");
  fixture.replacement.pending.stateHash = digest("new-state");
  await GET(new Request(`${callback}?error=access_denied&state=state`));
  expect(fixture.value).toEqual(fixture.replacement);
  expect(fixture.setCookie).not.toHaveBeenCalled();
});
