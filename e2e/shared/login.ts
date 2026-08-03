import type { Page } from "@playwright/test";

interface LoginInput {
  page: Page;
  baseUrl: string;
  credentials: {
    username: string;
    password: string;
  };
  destination?: string;
}

export const loginAsync = async ({ page, baseUrl, credentials, destination = "/" }: LoginInput) => {
  const destinationUrl = new URL(destination, baseUrl);
  const loginUrl = new URL("/auth/login", baseUrl);
  loginUrl.searchParams.set("callbackUrl", destinationUrl.href);

  await page.goto(loginUrl.href, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form !== null && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
  });
  await page.getByLabel("Username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);

  await page.locator("button[type='submit']").click();
  await waitForAuthenticatedSessionAsync(page, baseUrl);

  await page.goto(destinationUrl.href, { waitUntil: "domcontentloaded" });
  const currentUrl = new URL(page.url());
  if (currentUrl.origin !== destinationUrl.origin || currentUrl.pathname !== destinationUrl.pathname) {
    throw new Error("Authenticated destination was not reached");
  }
};

const waitForAuthenticatedSessionAsync = async (page: Page, baseUrl: string) => {
  const sessionUrl = new URL("/api/auth/session", baseUrl).href;
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const response = await page.request.get(sessionUrl);
    if (response.ok()) {
      const session = (await response.json()) as { user?: unknown } | null;
      if (session?.user !== undefined) return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error("Authentication session was not established");
};
