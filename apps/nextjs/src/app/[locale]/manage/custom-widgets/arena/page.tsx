import { Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { z } from "zod/v4";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { authorizeArena } from "./_authorize";
import { Arena } from "./_arena";
import { ArenaCapture } from "./_capture";
import { readArenaDataset } from "./_dataset";
import { readSmokeDataset } from "./_smoke";

const captureSchema = z.object({
  capture: z.string(),
  size: z.enum(["wide", "narrow"]).default("wide"),
  state: z.enum(["success", "loading", "error", "empty"]).default("success"),
});

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await authorizeArena();
  const query = await searchParams;
  const smoke = query.smoke === "1" || query.smoke === "unavailable";
  let dataset;
  try {
    if (smoke) dataset = await readSmokeDataset(query.smoke === "unavailable");
    else ({ dataset } = await readArenaDataset());
  } catch {
    return (
      <ManagePageLayout title="Widget arena" size="xl">
        <Text>The arena dataset is not available yet. Refresh this page after importing the generated outputs.</Text>
      </ManagePageLayout>
    );
  }
  if (query.capture !== undefined) {
    const capture = captureSchema.safeParse({ capture: query.capture, size: query.size, state: query.state });
    if (!capture.success) notFound();
    const candidate = dataset.candidates.find(({ id }) => id === capture.data.capture);
    const fixture = dataset.cases.find(({ id }) => id === candidate?.caseId);
    if (!candidate || !fixture) notFound();
    return (
      <ArenaCapture candidate={candidate} fixture={fixture} state={capture.data.state} viewport={capture.data.size} />
    );
  }
  return (
    <ManagePageLayout title={smoke ? "Widget arena · runtime smoke" : "Widget arena"} size="xl">
      <Arena dataset={dataset} />
    </ManagePageLayout>
  );
}
