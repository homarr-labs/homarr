export type SecretSourceBinding<TAuthentication> =
  | { readonly type: "integration" }
  | {
      readonly type: "http";
      readonly baseUrl: string;
      readonly networkScope: string;
      readonly authentication: TAuthentication;
    };

export function hasSameSecretBinding<TAuthentication>(
  left: SecretSourceBinding<TAuthentication>,
  right: SecretSourceBinding<TAuthentication>,
  hasSameSourceAuthentication: (left: TAuthentication, right: TAuthentication) => boolean,
) {
  if (left.type === "integration" || right.type === "integration") return false;
  return (
    new URL(left.baseUrl).origin === new URL(right.baseUrl).origin &&
    left.networkScope === right.networkScope &&
    hasSameSourceAuthentication(left.authentication, right.authentication)
  );
}
