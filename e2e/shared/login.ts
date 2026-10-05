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
  loginUrl.searchParams.set("callbackUrl", `${destinationUrl.pathname}${destinationUrl.search}${destinationUrl.hash}`);

  await page.goto(loginUrl.href, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form !== null && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
  });
  await page.getByLabel("Username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);

  const destinationNavigation = page.waitForURL(
    (url) =>
      url.origin === destinationUrl.origin &&
      url.pathname === destinationUrl.pathname &&
      url.search === destinationUrl.search &&
      url.hash === destinationUrl.hash,
    { timeout: 60_000 },
  );
  await page.locator("button[type='submit']").click();
  await destinationNavigation;
};
