import { devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  webServer: {
    port: 3000,
    command: "pnpm docusaurus serve",
  },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  workers: "100%",
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
};

export default config;
