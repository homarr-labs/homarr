import { api } from "@homarr/api/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { InviteListComponent } from "./_components/invite-list";

export default async function InvitesOverviewPage() {
  const initialInvites = await api.invite.getAll();
  return (
    <>
      <DynamicBreadcrumb />
      <InviteListComponent initialInvites={initialInvites} />
    </>
  );
}
