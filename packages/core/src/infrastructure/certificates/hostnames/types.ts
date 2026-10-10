export interface TrustedCertificateHostname {
  hostname: string;
  thumbprint: string;
  certificate: string;
}

export interface TrustedCertificateHostnameStore {
  listAsync: () => Promise<TrustedCertificateHostname[]>;
  addAsync: (grant: TrustedCertificateHostname) => Promise<void>;
  removeAsync: (hostname: string, thumbprint: string) => Promise<void>;
  removeByFingerprintAsync: (thumbprint: string) => Promise<void>;
}
