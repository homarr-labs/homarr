import { ORPCError } from "@orpc/client";

import type { Translate } from "./types";

export function onboardingError(error: unknown, t: Translate): string {
  if (!(error instanceof ORPCError)) return t("init.studio.claim.errorDescription");
  if (error.code === "FORBIDDEN" && error.message === "This onboarding session is not claimed.") {
    return t("init.studio.claim.errorDescription");
  }
  if (error.code === "FORBIDDEN" && error.message === "Step denied") {
    return t("init.studio.claim.errorDescription");
  }
  if (error.code === "UNAUTHORIZED") return t("init.studio.claim.signInDescription");
  return t("init.studio.claim.errorDescription");
}

export function isOnboardingAuthorityError(error: unknown): boolean {
  return error instanceof ORPCError && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED");
}
