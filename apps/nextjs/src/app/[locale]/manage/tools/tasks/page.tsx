import { Box, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { JobsList } from "./_components/jobs-list";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function TasksPage() {
  const jobs = await api.cronJobs.getJobs();
  return (
    <Box>
      <Title mb={"md"}>Tasks</Title>
      <JobsList initialJobs={jobs} />
    </Box>
  );
}
