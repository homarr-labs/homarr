import { notFound } from "next/navigation";
import { Stack, Text, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";

import { FeatureStateWorkbench } from "./_feature-state-workbench";
import { getResponseContractFixtureResultsAsync } from "./_response-contract-fixtures";

export default async function FeatureWorkbenchPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) notFound();
  const responseResults = await getResponseContractFixtureResultsAsync();

  return (
    <Stack gap="xl">
      <div>
        <Title>Native feature state workbench</Title>
        <Text c="dimmed" maw={720}>
          A development-only fixture surface for reviewing shared catalog and integration response states without live
          services.
        </Text>
      </div>
      <FeatureStateWorkbench responseResults={responseResults} />
    </Stack>
  );
}
