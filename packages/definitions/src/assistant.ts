export const assistantProviderIds = [
  "openrouter",
  "openai",
  "anthropic",
  "google-gemini",
  "xai",
  "groq",
  "mistral",
  "deepseek",
  "together",
  "ollama",
  "lm-studio",
  "custom",
] as const;

export type AssistantProvider = (typeof assistantProviderIds)[number];
export type AssistantProviderCategory = "hosted" | "local" | "custom";

const providerIconBaseUrl = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons";

interface AssistantProviderPreset {
  baseUrl: string;
  modelDiscoveryPath: string | null;
  requiresApiKey: boolean;
  category: AssistantProviderCategory;
  discoveryAuthentication: "bearer" | "anthropic";
  iconUrl: string | null;
}

export const assistantProviderPresets = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/openrouter-color.svg`,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/openai.svg`,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "anthropic",
    iconUrl: `${providerIconBaseUrl}/anthropic.svg`,
  },
  "google-gemini": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/gemini-color.svg`,
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/xai.svg`,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/groq.svg`,
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/mistral-color.svg`,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/deepseek-color.svg`,
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/together-color.svg`,
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/ollama.svg`,
  },
  "lm-studio": {
    baseUrl: "http://localhost:1234/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/lmstudio.svg`,
  },
  custom: {
    baseUrl: "",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "custom",
    discoveryAuthentication: "bearer",
    iconUrl: null,
  },
} as const satisfies Record<AssistantProvider, AssistantProviderPreset>;

export const assistantProviderRequiresApiKey = (provider: AssistantProvider) =>
  assistantProviderPresets[provider].requiresApiKey;
