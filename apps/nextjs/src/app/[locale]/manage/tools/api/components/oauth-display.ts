export const formatOAuthDisplayText = (value: string) =>
  value.replace(
    /[\p{Cc}\p{Zl}\p{Zp}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu,
    (character) => `[U+${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}]`,
  );

export const getOAuthCallbackHost = (redirectUri: string | null) => {
  if (!redirectUri) return null;
  try {
    const url = new URL(redirectUri);
    return url.protocol === "http:" || url.protocol === "https:" ? url.host || null : null;
  } catch {
    return null;
  }
};
