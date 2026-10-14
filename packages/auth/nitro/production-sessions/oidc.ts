import { customFetch } from "@auth/core";
import type { OIDCConfig } from "@auth/core/providers";
import type { Profile } from "@auth/core/types";

import { assertVerifiedEmailForCredentialsLinking } from "../../providers/oidc/verified-email";
import { IssuerStagingError } from "./persistence";

export interface IssuerOidcConfiguration {
  readonly name: string;
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenEndpointAuthMethod: string;
  readonly scope: string;
  readonly redirectUri: string;
  readonly redirectProxyUrl: string;
  readonly forceUserinfo: boolean;
  readonly dangerousAccountLinking: boolean;
  readonly dangerousCredentialsLinking: boolean;
  readonly nameAttribute: string | null;
  readonly groupsAttribute: string;
  readonly groupsLocalManagement: boolean;
  readonly fetch: typeof fetch;
}

export function issuerProfileValue(profile: Profile, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, key)) return undefined;
    return Reflect.get(value, key);
  }, profile);
}

export function issuerProfileName(profile: Profile, nameAttribute: string | null): string | undefined {
  if (nameAttribute) {
    const name = issuerProfileValue(profile, nameAttribute);
    if (typeof name === "string") return name;
    return undefined;
  }
  if (profile.preferred_username?.includes("@")) return profile.name ?? undefined;
  return profile.preferred_username ?? undefined;
}

export function createIssuerOidcProvider(configuration: IssuerOidcConfiguration): OIDCConfig<Profile> {
  return {
    id: "oidc",
    name: configuration.name,
    type: "oidc",
    issuer: configuration.issuer,
    clientId: configuration.clientId,
    clientSecret: configuration.clientSecret,
    client: { token_endpoint_auth_method: configuration.tokenEndpointAuthMethod },
    allowDangerousEmailAccountLinking:
      configuration.dangerousAccountLinking || configuration.dangerousCredentialsLinking,
    authorization: { params: { scope: configuration.scope, redirect_uri: configuration.redirectUri } },
    redirectProxyUrl: configuration.redirectProxyUrl,
    checks: ["pkce", "state", "nonce"],
    idToken: !configuration.forceUserinfo,
    token: {
      conform(response: Response) {
        if (response.status === 401) return response;
        const headers = new Headers(response.headers);
        headers.delete("www-authenticate");
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      },
    },
    profile(profile) {
      if (!profile.sub) throw new IssuerStagingError();
      assertVerifiedEmailForCredentialsLinking(profile, configuration.dangerousCredentialsLinking);
      const name = issuerProfileName(profile, configuration.nameAttribute);
      if (!name) throw new IssuerStagingError();
      let image: string | null = null;
      if (typeof profile.picture === "string") image = profile.picture;
      return { id: profile.sub, name, email: profile.email, image };
    },
    [customFetch]: configuration.fetch,
  };
}
