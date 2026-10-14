import type { FixtureIdentity } from "../../contracts/schemas";
import { getFixtureRepository } from "../database/lifecycle";
import type { FixtureRepository } from "../database/repository";
import { resolveSession } from "../session/service";
import { getFixtureConfig } from "./config";
import type { FixtureConfig } from "./config";

export interface SessionPrincipal {
  identity: FixtureIdentity;
  expiresAt: string;
}

export interface RequestContext {
  request: Request;
  signal: AbortSignal;
  responseHeaders: Headers;
  repository: FixtureRepository;
  session: SessionPrincipal | null;
  config: FixtureConfig;
}

export async function createRequestContext(request: Request): Promise<RequestContext> {
  const config = getFixtureConfig();
  const repository = await getFixtureRepository();
  return {
    request,
    signal: request.signal,
    responseHeaders: new Headers(),
    repository,
    session: await resolveSession(request, repository, config),
    config,
  };
}
