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

interface AssistantProviderPreset {
  baseUrl: string;
  modelDiscoveryPath: string | null;
  requiresApiKey: boolean;
  category: AssistantProviderCategory;
  discoveryAuthentication: "bearer" | "anthropic";
}

export const assistantProviderPresets = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "anthropic",
  },
  "google-gemini": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
  },
  "lm-studio": {
    baseUrl: "http://localhost:1234/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
  },
  custom: {
    baseUrl: "",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "custom",
    discoveryAuthentication: "bearer",
  },
} as const satisfies Record<AssistantProvider, AssistantProviderPreset>;

export const assistantProviderRequiresApiKey = (provider: AssistantProvider) =>
  assistantProviderPresets[provider].requiresApiKey;
