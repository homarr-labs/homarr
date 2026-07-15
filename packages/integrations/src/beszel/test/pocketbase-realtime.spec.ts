import { describe, expect, test } from "vitest";

import { createRealtimeMetricsTopic, PocketBaseSseParser } from "../pocketbase-realtime";

describe("PocketBaseSseParser", () => {
  test("parses PB_CONNECT client IDs and CRLF-delimited frames split across chunks", () => {
    const parser = new PocketBaseSseParser();
    expect(parser.push("event: PB_CONNECT\r\nid: client-")).toEqual([]);
    expect(parser.push("123\r\ndata: {}\r\n\r\n")).toEqual([{ event: "PB_CONNECT", id: "client-123", data: "{}" }]);
  });

  test("joins multiline data and ignores keepalive comments", () => {
    const parser = new PocketBaseSseParser();
    expect(parser.push(': keepalive\n\nevent: rt_metrics\ndata: {"stats":\ndata: {}}\n\n')).toEqual([
      { event: "rt_metrics", id: undefined, data: '{"stats":\n{}}' },
    ]);
  });

  test("flushes a trailing frame when the stream ends without a blank line", () => {
    const parser = new PocketBaseSseParser();
    expect(parser.push("event: rt_metrics\ndata: {}")).toEqual([]);
    expect(parser.finish()).toEqual([{ event: "rt_metrics", id: undefined, data: "{}" }]);
  });
});

describe("createRealtimeMetricsTopic", () => {
  test("matches the PocketBase custom-topic options encoding used by Beszel", () => {
    const topic = createRealtimeMetricsTopic("system-1");
    expect(topic).toBe(`rt_metrics?options=${encodeURIComponent(JSON.stringify({ query: { system: "system-1" } }))}`);
  });
});
