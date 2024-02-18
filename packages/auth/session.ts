import { randomUUID } from "crypto";

export const sessionMaxAgeInSeconds = 30 * 24 * 60 * 60; // 30 days
export const sessionTokenCookieName = "next-auth.session-token";

export const expireDateAfter = (seconds: number) => {
  return new Date(Date.now() + seconds * 1000);
};

export const generateSessionToken = () => {
  return randomUUID();
};
