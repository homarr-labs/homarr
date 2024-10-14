import { notFound } from "next/navigation";
import { Box, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { JobsList } from "./_components/jobs-list";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const jobs = await api.cronJobs.getJobs();
  return (
    <Box>
      <Title mb={"md"}>Tasks</Title>
      <JobsList initialJobs={jobs} />
    </Box>
  );
}
