import { redirect } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { WorkshopPublishForm } from "./_workshop-publish-form";

interface WorkshopPublishPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopPublishPage(props: WorkshopPublishPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");

  const { id } = await props.params;
  const definition = await api.customWidget.get({ id }).catch(catchTrpcNotFound);

  return <WorkshopPublishForm widget={{ id, name: definition.name }} />;
}
