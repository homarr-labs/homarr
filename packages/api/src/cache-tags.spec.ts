import { describe, expect, it } from "vitest";

import { cacheTags } from "./cache-tags";

describe("cacheTags", () => {
  it("produces stable tag shapes", () => {
    expect(cacheTags.serverSettings()).toBe("server-settings");
    expect(cacheTags.board("abc")).toBe("board:abc");
    expect(cacheTags.boardByName("My Board")).toBe("board-name:MY BOARD");
    expect(cacheTags.boardList()).toBe("board-list");
    expect(cacheTags.user("u1")).toBe("user:u1");
    expect(cacheTags.integration("i1")).toBe("integration:i1");
    expect(cacheTags.app("a1")).toBe("app:a1");
  });

  it("boardByName uppercases consistently", () => {
    expect(cacheTags.boardByName("home")).toBe(cacheTags.boardByName("HOME"));
    expect(cacheTags.boardByName("Home")).toBe(cacheTags.boardByName("hOmE"));
  });
});
