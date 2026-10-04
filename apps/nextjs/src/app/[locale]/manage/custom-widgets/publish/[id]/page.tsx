import { redirect } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";

import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { WorkshopPublishForm } from "./_workshop-publish-form";

interface WorkshopPublishPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopPublishPage(props: WorkshopPublishPageProps) {
  const [session, { id }] = await Promise.all([auth(), props.params]);
  if (!session) redirect(createLoginUrl(`/manage/custom-widgets/publish/${id}`));
  if (!session.user.permissions.includes("admin")) redirect("/");
  const definition = await api.customWidget.get({ id }).catch(catchTrpcNotFound);

  return <WorkshopPublishForm widget={{ id, name: definition.name }} />;
}
