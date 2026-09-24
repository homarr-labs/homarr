#!/usr/bin/env node

const fixtureOrigin = process.env.FIXTURE_ORIGIN ?? "http://127.0.0.1:47612";
const { getLatestMatchingReleaseAsync } = await import("/app/packages/request-handler/src/release-providers.ts");

const run = async () => {
  const full = await getLatestMatchingReleaseAsync({
    id: "github-over-1000",
    provider: "github",
    identifier: "fixture-owner/fixture-repository",
    providerUrl: `${fixtureOrigin}/github`,
  });
  const capped = await getLatestMatchingReleaseAsync({
    id: "github-page-11-cap",
    provider: "github",
    identifier: "fixture-owner/fixture-repository",
    providerUrl: `${fixtureOrigin}/github-cap`,
  });
  const metrics = await (await fetch(`${fixtureOrigin}/__metrics`)).json();
  console.log(
    JSON.stringify(
      {
        fixtureOrigin,
        fullHistory: {
          success: full.success,
          latestRelease: full.success ? full.data.latestRelease : undefined,
          error: full.success ? undefined : full.error.message,
        },
        cappedHistory: {
          success: capped.success,
          errorCode: capped.success ? undefined : capped.error.code,
          errorMessage: capped.success ? undefined : capped.error.message,
          controlledFailure: !capped.success && capped.error.code === "unexpected",
        },
        metrics: {
          githubPages: metrics.githubPages,
          githubCapPages: metrics.githubCapPages,
          githubCapErrors: metrics.githubCapErrors,
          githubReleaseItems: metrics.githubReleaseItems,
        },
      },
      null,
      2,
    ),
  );
};

await run();
