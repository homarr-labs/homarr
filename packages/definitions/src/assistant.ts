export const assistantProviderIds = [
  "homarr",
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
export const assistantHomarrProviderTokenHeader = "X-Homarr-Provider-Token";

export const assistantReasoningModes = ["auto", "none", "minimal", "low", "medium", "high"] as const;
export type AssistantReasoningMode = (typeof assistantReasoningModes)[number];

export interface AssistantModelOption {
  id: string;
  name: string;
}

export const getAssistantModelOptionLabel = (model: AssistantModelOption) =>
  model.name === model.id ? model.id : `${model.name} (${model.id})`;

export const resolveAssistantModelId = (models: AssistantModelOption[], value: string) =>
  models.find((model) => model.id === value || getAssistantModelOptionLabel(model) === value)?.id ?? null;

const providerIconBaseUrl = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons";

interface AssistantProviderPreset {
  baseUrl: string;
  modelDiscoveryPath: string | null;
  requiresApiKey: boolean;
  category: AssistantProviderCategory;
  discoveryAuthentication: "bearer" | "anthropic";
  iconUrl: string | null;
  darkIconUrl?: string;
}

export const assistantProviderPresets = {
  homarr: {
    baseUrl: "https://homarr.dev/api/ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: "https://homarr.dev/img/logo.png",
  },
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
    darkIconUrl: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/groq.png",
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

/**
 * OpenRouter and Homarr Router implement OpenRouter server tools directly.
 * Custom endpoints may opt in when they proxy the OpenRouter request format.
 */
export const assistantProviderCanUseOpenRouterServerTools = (provider: AssistantProvider) =>
  provider === "openrouter" || provider === "homarr" || provider === "custom";
