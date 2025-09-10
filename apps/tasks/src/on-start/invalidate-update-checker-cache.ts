import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

export async function invalidateUpdateCheckerCacheAsync() {
  const handler = updateCheckerRequestHandler.handler({});
  await handler.invalidateAsync();
}
