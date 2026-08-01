import { describe, expect, it } from "vitest";

import { readBoundedJsonResponseAsync, validateCustomApiUrl } from "../custom-api-security";

describe("custom API request hardening", () => {
  it("accepts HTTP endpoints without embedded credentials", () => {
    expect(validateCustomApiUrl("https://api.example.com/v1/data").hostname).toBe("api.example.com");
  });

  it.each(["file:///etc/passwd", "https://user:secret@example.com/data"])("rejects unsafe URL %s", (url) => {
    expect(() => validateCustomApiUrl(url)).toThrow();
  });

  it("rejects a response once its byte budget is exceeded", async () => {
    const response = new Response(JSON.stringify({ value: "x".repeat(100) }));
    await expect(readBoundedJsonResponseAsync(response, 32)).rejects.toThrow("exceeds 32 bytes");
  });
});
