import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

export function oauthErrorMessage(caught: unknown) {
  const message = errorMessage(caught, "GitHub sign-in failed");
  if (/popup.*block|blocked.*popup/iu.test(message))
    return "GitHub sign-in popup was blocked. Allow popups for this site and try again.";
  if (/cancel|closed.*popup|popup.*closed/iu.test(message)) return "GitHub sign-in was cancelled before it completed.";
  if (/provider|oauth|redirect|callback|client.?id/iu.test(message))
    return "GitHub sign-in is not configured correctly on the Workshop server.";
  return message;
}
