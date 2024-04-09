import { api } from "@homarr/api/server";

import { InviteListComponent } from "./_components/invite-list";

export default async function InvitesOverviewPage() {
  const initialInvites = await api.invite.all();
  return <InviteListComponent initialInvites={initialInvites} />;
}
