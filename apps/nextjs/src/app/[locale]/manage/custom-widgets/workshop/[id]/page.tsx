import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { WorkshopDetail } from "./_workshop-detail";

interface WorkshopDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopDetailPage(props: WorkshopDetailPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");

  const { id } = await props.params;

  return <WorkshopDetail id={id} />;
}
