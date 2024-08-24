import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { isProviderEnabled } from "@homarr/auth/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { InviteListComponent } from "./_components/invite-list";

export default async function InvitesOverviewPage() {
  if (!isProviderEnabled("credentials")) {
    notFound();
  }

  const initialInvites = await api.invite.getAll();
  return (
    <>
      <DynamicBreadcrumb />
      <InviteListComponent initialInvites={initialInvites} />
    </>
  );
}
