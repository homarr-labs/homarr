import { randomUUID } from "crypto";

export const expireDateAfter = (seconds: number) => {
  return new Date(Date.now() + seconds * 1000);
};

export const generateSessionToken = () => {
  return randomUUID();
};
