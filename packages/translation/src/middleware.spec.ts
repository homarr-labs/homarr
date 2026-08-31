import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { createI18nMiddleware } from "./middleware";

const createRewrittenRequest = (response: Response) => {
  const destination = response.headers.get("x-middleware-rewrite");
  const overriddenHeaderNames = response.headers.get("x-middleware-override-headers")?.split(",") ?? [];
  const headers = new Headers();

  for (const name of overriddenHeaderNames) {
    const value = response.headers.get(`x-middleware-request-${name}`);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  if (destination === null) {
    throw new Error("Expected middleware to rewrite the request");
  }

  return new NextRequest(destination, { headers });
};

describe("createI18nMiddleware", () => {
  it("canonicalizes a prefixed path when the locale header is supplied externally", () => {
    const middleware = createI18nMiddleware("en");
    const request = new NextRequest("http://localhost/en/auth/login", {
      headers: {
        cookie: "homarr.locale=fr",
        "x-next-intl-locale": "en",
      },
    });

    const response = middleware(request);

    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("location")).toBe("http://localhost/auth/login");
    expect(response.headers.get("set-cookie")).toContain("homarr.locale=en");
  });

  it("continues a valid internal locale handoff across middleware instances", () => {
    const firstPassMiddleware = createI18nMiddleware("en");
    const publicRequest = new NextRequest("http://localhost/auth/login");

    const rewriteResponse = firstPassMiddleware(publicRequest);
    expect(rewriteResponse.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/auth/login");

    const localizedRequest = createRewrittenRequest(rewriteResponse);
    const secondPassMiddleware = createI18nMiddleware("en");
    const handoffResponse = secondPassMiddleware(localizedRequest);

    expect(handoffResponse.headers.get("x-middleware-next")).toBe("1");
    expect(handoffResponse.headers.get("location")).toBeNull();
    expect(handoffResponse.headers.get("x-middleware-override-headers")).toBe("x-next-intl-locale");
  });

  it.each([
    {
      name: "unsupported locale",
      pathname: "/en/auth/login",
      locale: "xx",
    },
    {
      name: "locale that does not match the path",
      pathname: "/fr/auth/login",
      locale: "en",
    },
  ])("does not continue an internal handoff with a $name", ({ pathname, locale }) => {
    const middleware = createI18nMiddleware("en");
    const rewriteResponse = middleware(new NextRequest("http://localhost/auth/login"));
    const rewrittenRequest = createRewrittenRequest(rewriteResponse);
    rewrittenRequest.headers.set("x-next-intl-locale", locale);
    const request = new NextRequest(`http://localhost${pathname}`, {
      headers: rewrittenRequest.headers,
    });

    const response = middleware(request);

    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("location")).toBe("http://localhost/auth/login");
  });

  it("canonicalizes a directly requested prefixed path and synchronizes its locale", () => {
    const middleware = createI18nMiddleware("en");
    const request = new NextRequest("http://localhost/fr/auth/login");

    const response = middleware(request);

    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("location")).toBe("http://localhost/auth/login");
    expect(response.headers.get("set-cookie")).toContain("homarr.locale=fr");
  });
});
