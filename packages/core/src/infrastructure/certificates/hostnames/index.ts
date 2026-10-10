export type { TrustedCertificateHostname, TrustedCertificateHostnameStore } from "./types";
import type { TrustedCertificateHostnameStore } from "./types";

export const createTrustedCertificateHostnameReader = (store: Pick<TrustedCertificateHostnameStore, "listAsync">) => ({
  getTrustedCertificateHostnamesAsync: () => store.listAsync(),
});

export const getTrustedCertificateHostnamesAsync = async (
  store?: Pick<TrustedCertificateHostnameStore, "listAsync">,
) => {
  if (!store) throw new Error("An explicit trusted certificate hostname store is required");
  return store.listAsync();
};
