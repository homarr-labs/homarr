export interface VpnProviderDetails {
  protocol: string;
  provider: string;
}

export interface VpnSummary {
  vpnStatus: string;
  dnsStatus: string;
  publicIp: string;
  country: string;
  city: string;
  vpnProvider: VpnProviderDetails;
}
