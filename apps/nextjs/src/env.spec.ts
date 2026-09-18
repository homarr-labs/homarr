import { describe, expect, test } from "vitest";

import { baseUrlSchema } from "./env";

describe("BASE_URL", () => {
  test.each(["http://localhost:7575", "https://homarr.example.com", "https://homarr.example.com/"])(
    "accepts the HTTP(S) origin %s",
    (value) => {
      expect(baseUrlSchema.safeParse(value).success).toBe(true);
    },
  );

  test.each([
    "ftp://homarr.example.com",
    "https://user:password@homarr.example.com",
    "https://homarr.example.com/prefix",
    "https://homarr.example.com/.",
    "https://homarr.example.com/a/..",
    "https://homarr.example.com?preview=1",
    "https://homarr.example.com#preview",
  ])("rejects the non-origin URL %s", (value) => {
    expect(baseUrlSchema.safeParse(value).success).toBe(false);
  });
});
