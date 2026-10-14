export type AuthCredentialProvider = "credentials" | "ldap";
export type AuthProvider = AuthCredentialProvider | "oidc";

export type AuthFailureCode =
  | "invalid-credentials"
  | "provider-error"
  | "csrf-rejected"
  | "session-expired"
  | "unavailable";

export interface AuthFailure {
  status: "rejected";
  code: AuthFailureCode;
}

export interface AuthCredentialRequest {
  name: string;
  password: string;
  csrfToken: string;
  callbackUrl: string;
}

export interface AuthNavigationRequest {
  csrfToken: string;
  callbackUrl: string;
}

export interface AuthFrontendRequestOptions {
  signal: AbortSignal;
}

export interface AuthFrontendNavigationOptions extends AuthFrontendRequestOptions {
  isCurrent: () => boolean;
}

export interface AuthFrontendTransport {
  readCsrfToken?: (options?: AuthFrontendRequestOptions) => Promise<{ status: "ready"; token: string } | AuthFailure>;
  signInCredentials?: (
    request: AuthCredentialRequest,
    options?: AuthFrontendRequestOptions,
  ) => Promise<{ status: "authenticated" } | AuthFailure>;
  signInLdap?: (
    request: AuthCredentialRequest,
    options?: AuthFrontendRequestOptions,
  ) => Promise<{ status: "authenticated" } | AuthFailure>;
  beginOidc?: (
    request: AuthNavigationRequest,
    options?: AuthFrontendRequestOptions,
  ) => Promise<{ status: "redirect"; url: string } | AuthFailure>;
  signOut?: (
    request: AuthNavigationRequest,
    options?: AuthFrontendRequestOptions,
  ) => Promise<{ status: "signed-out"; providerLogoutUrl?: string } | AuthFailure>;
}

export interface AuthFrontendNavigation {
  returnTo: (path: string, options?: AuthFrontendNavigationOptions) => void | Promise<void>;
  providerRedirect: (url: string, options?: AuthFrontendNavigationOptions) => void | Promise<void>;
  acceptsProviderUrl: (url: string, purpose: "sign-in" | "sign-out") => boolean;
}

export interface AuthUiMessages {
  username: string;
  password: string;
  passwordVisibility: string;
  usernameRequired: string;
  passwordRequired: string;
  signIn: string;
  signInWith: (provider: string) => string;
  signOut: string;
  forgotPassword: string;
  resetPasswordDescription: string;
  errorTitle: string;
  errors: Record<AuthFailureCode, string>;
  sessionExpiredTitle: string;
  sessionExpiredDescription: string;
  resumeSignIn: string;
}

export type AuthSessionUiState = { status: "unknown" } | { status: "active" } | { status: "expired" };
