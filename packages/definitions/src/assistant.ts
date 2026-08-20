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
export type AssistantProviderCategory = "free" | "hosted" | "local" | "custom";
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
  label?: string;
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
    label: "Homarr",
    // Browser and server code replace this public fallback with WORKSHOP_API_URL at runtime.
    baseUrl: "https://homarr.dev/api/ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "free",
    discoveryAuthentication: "bearer",
    iconUrl: "https://homarr.dev/img/logo.png",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/openrouter-color.svg`,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/openai.svg`,
  },
  anthropic: {
    label: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "anthropic",
    iconUrl: `${providerIconBaseUrl}/anthropic.svg`,
  },
  "google-gemini": {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/gemini-color.svg`,
  },
  xai: {
    label: "xAI",
    baseUrl: "https://api.x.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/xai.svg`,
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/groq.svg`,
    darkIconUrl: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/groq.png",
  },
  mistral: {
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/mistral-color.svg`,
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/deepseek-color.svg`,
  },
  together: {
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: true,
    category: "hosted",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/together-color.svg`,
  },
  ollama: {
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/ollama.svg`,
  },
  "lm-studio": {
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    modelDiscoveryPath: "/models",
    requiresApiKey: false,
    category: "local",
    discoveryAuthentication: "bearer",
    iconUrl: `${providerIconBaseUrl}/lmstudio.svg`,
  },
  custom: {
    label: undefined,
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
