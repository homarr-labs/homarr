/**
 * The AI SDK resolves provider options by the provider name registered on the
 * language model. The @ai-sdk/openai-compatible provider converts the raw
 * provider name (for example `homarr-openrouter`) to camelCase
 * (`homarrOpenrouter`) and warns when the raw key is still used. This helper
 * mirrors that conversion so providerOptions reach the provider without a
 * deprecation warning.
 */
export const toProviderOptionsKey = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("");
