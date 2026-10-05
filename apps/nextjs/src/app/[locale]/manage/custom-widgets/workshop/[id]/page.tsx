import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";

import { WorkshopDetail } from "./_workshop-detail";

interface WorkshopDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopDetailPage(props: WorkshopDetailPageProps) {
  const [session, { id }] = await Promise.all([auth(), props.params]);
  if (!session) redirect(createLoginUrl(`/manage/custom-widgets/workshop/${id}`));
  if (!session.user.permissions.includes("admin")) redirect("/");

  return <WorkshopDetail id={id} />;
}
