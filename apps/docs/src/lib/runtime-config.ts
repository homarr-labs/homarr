interface HomarrRuntimeConfig {
  homarrWebsiteUrl?: string;
  workshopApiUrl?: string;
  workshopWebUrl?: string;
}

declare global {
  interface Window {
    homarrRuntimeConfig?: Readonly<HomarrRuntimeConfig>;
  }
}

export const getRuntimeWorkshopApiUrl = (configuredUrl: string): string => {
  if (typeof window === "undefined") return configuredUrl;
  return window.homarrRuntimeConfig?.workshopApiUrl || configuredUrl || window.location.origin;
};
