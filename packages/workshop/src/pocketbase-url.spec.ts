import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_STARTER, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import { PocketBaseUrl } from "./pocketbase-url";

describe("PocketBase URL compatibility", () => {
  test.each([
    "https://example.com",
    "https://example.com.",
    "https://münich.example",
    "https://xn--mnich-kva.example",
    "http://example.com:0",
    "http://example.com:",
    "http://example.com:80",
    "http://[::1]:8090",
    "http://[::ffff:192.168.1.1]",
  ])("accepts canonical URL %s", (value) => {
    expect(URL.canParse(value)).toBe(true);
    expect(PocketBaseUrl.canParse(value)).toBe(true);
  });

  test.each([
    "http://",
    "https://:",
    "http://1.2.3.4.5",
    "http://09.0.0.1",
    "http://099.0.0.1",
    "http://[:::1]",
    "http://[::ffff:192.168.001.001]",
    "http://[::ffff:192.168.1.01]",
    "http://[fe80::1%25eth0]",
    "http://example.com:65536",
    "https://xn--a.example",
    "https://xn--0.example",
    "https://xn--abc.example",
  ])("rejects canonical invalid URL %s", (value) => {
    expect(URL.canParse(value)).toBe(false);
    expect(PocketBaseUrl.canParse(value)).toBe(false);
  });

  test.each([
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://0177.0.0.1",
    "http://1.2.3",
    "http://%31%32%37.0.0.1",
    "https://%65xample.com",
    "https://example%2ecom",
    "https://example.com\\@attacker.invalid",
    "https:\\\\example.com\\api",
    "https://-example.com",
    "https://example-.com",
    "https://example..com",
    "https://example.com:00080",
    "https://example.com:0000000065535",
    "https://example。com",
    "https://１２７.０.０.１",
    " https://example.com",
    "https://exa\tmple.com",
    "https://example.com/path\u00a0",
  ])("conservatively rejects WHATWG-normalized URL %s", (value) => {
    expect(URL.canParse(value)).toBe(true);
    expect(PocketBaseUrl.canParse(value)).toBe(false);
  });

  test("normalizes international hostnames like the native parser", () => {
    expect(new PocketBaseUrl("https://münich.example").hostname).toBe("xn--mnich-kva.example");
    expect(new PocketBaseUrl("https://例え.テスト.").hostname).toBe("xn--r8jz45g.xn--zckzah.");
  });

  test.each([
    "https://example.com",
    "https://example.com.",
    "https://münich.example",
    "https://例え.テスト",
    "https://xn--r8jz45g.xn--zckzah",
    "http://192.168.1.1:0",
    "https://[2001:db8::1]:65535",
    "https://[::ffff:192.168.1.1]",
    "http://0.0.0.0",
    "http://255.255.255.255",
    "https://example.com:",
    "https://example.com:0",
    "https://example.com:65535",
    "http://[::]",
    "http://[::1]",
    "http://[1:2:3:4:5:6:7:8]",
    "http://[1:2:3:4:5:6:7::]",
    "https://faß.de",
    "https://xn--fa-hia.de",
    "https://مثال.إختبار",
    "https://a_b.example",
    "https://example.com/%5c@evil",
    "https://example.com/%2f%2fevil",
    "https://example.com/icon.svg?next=https%3A%2F%2Fevil#preview",
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://0xffffffff",
    "http://0x100000000",
    "http://0177.0.0.1",
    "http://0377.0377.0377.0377",
    "http://1.2.3",
    "http://1.",
    "http://1..2",
    "http://256.0.0.1",
    "http://00.0.0.0",
    "http://%31%32%37.0.0.1",
    "https://%65xample.com",
    "https://example%2ecom",
    "https://example.com\\@attacker.invalid",
    "https:\\\\example.com\\api",
    " https://example.com",
    "https://exa\tmple.com",
    "https://example.com\n",
    "https://example.com\u00a0",
    "https://@example.com",
    "https://:@example.com",
    "https://example。com",
    "https://１２７.０.０.１",
    "https://-example.com",
    "https://example-.com",
    "https://example..com",
    "https://example.com:01",
    "https://example.com:00080",
    "https://example.com:0000000065535",
    "https://example.com:65536",
    "https://example.com:655350",
    "https://[fe80::1%25eth0]",
    "https://[::ffff:192.168.001.001]",
    "https://[1:2:3:4:5:6:7:8:9]",
    "https://\u200d.example",
    "http:example.com",
    "https:/example.com",
    "https:///example.com",
    "ftp://example.com",
    "file:///tmp/icon.svg",
    "https://user:password@example.com",
  ])("keeps canonical source and icon validation in parity for %s", (value) => {
    const validate = (UrlImplementation: typeof URL, field: "source" | "icon") => {
      const runtime = globalThis as unknown as { URL: typeof URL };
      const originalUrl = runtime.URL;
      runtime.URL = UrlImplementation;
      try {
        const definition =
          field === "source"
            ? {
                ...CUSTOM_WIDGET_STARTER,
                sources: {
                  default: { ...CUSTOM_WIDGET_STARTER.sources.default, baseUrl: value },
                },
              }
            : { ...CUSTOM_WIDGET_STARTER, iconUrl: value };
        return customWidgetDefinitionSchema.safeParse(definition).success;
      } finally {
        runtime.URL = originalUrl;
      }
    };

    const nativeUrl = URL;
    expect(validate(PocketBaseUrl as unknown as typeof URL, "source")).toBe(validate(nativeUrl, "source"));
    expect(validate(PocketBaseUrl as unknown as typeof URL, "icon")).toBe(validate(nativeUrl, "icon"));
  });

  test("exposes the URL fields used by the canonical schema", () => {
    const url = new PocketBaseUrl("https://user:password@example.com:8443/icon.svg?token=secret&mode=dark#icon");
    expect(url).toMatchObject({
      protocol: "https:",
      username: "user",
      password: "password",
      hostname: "example.com",
      port: "8443",
      search: "?token=secret&mode=dark",
      hash: "#icon",
    });
    expect(url.searchParams.keys()).toEqual(["token", "mode"]);
  });

  test("validates credential queries without iterable URLSearchParams", () => {
    const runtime = globalThis as unknown as { URL: typeof URL };
    const originalUrl = runtime.URL;
    runtime.URL = PocketBaseUrl as unknown as typeof URL;
    try {
      expect(
        customWidgetDefinitionSchema.safeParse({
          ...CUSTOM_WIDGET_STARTER,
          iconUrl: "https://example.com/icon.svg?clientSecret=must-never-be-published",
        }).success,
      ).toBe(false);
      expect(
        customWidgetDefinitionSchema.safeParse({
          ...CUSTOM_WIDGET_STARTER,
          requests: {
            default: {
              ...CUSTOM_WIDGET_STARTER.requests.default,
              path: "/api/status?key=status&auth=none",
            },
          },
        }).success,
      ).toBe(true);
    } finally {
      runtime.URL = originalUrl;
    }
  });
});
