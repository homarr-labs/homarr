import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { db } from "@homarr/db";
import { FrameleafConnectionError, FrameleafDatabaseStore, FrameleafReader } from "@homarr/integrations/frameleaf";

import { frameleafError, frameleafResponseHeaders, requireFrameleafSessionAsync } from "../_access";

export async function GET(request: Request) {
  try {
    const { session } = await requireFrameleafSessionAsync();
    const id = new URL(request.url).searchParams.get("integrationId") ?? "";
    const permitted = (await getIntegrationsWithPermissionsAsync(session)).find((integration) => integration.id === id);
    if (!permitted?.permissions.hasUseAccess) throw new FrameleafConnectionError("consent");
    const albums = await new FrameleafReader(new FrameleafDatabaseStore(db, id)).albumsAsync();
    return Response.json(
      { albums: albums.map(({ id: albumId, name }) => ({ id: albumId, name })) },
      { headers: frameleafResponseHeaders },
    );
  } catch (error) {
    return frameleafError(error);
  }
}
