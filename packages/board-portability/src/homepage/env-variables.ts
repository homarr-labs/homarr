const ENV_VAR_PATTERN = /\{\{(HOMEPAGE_VAR_[A-Z0-9_]+)\}\}/g;

export const extractHomepageEnvVariables = (content: string): string[] => {
  const matches = new Set<string>();
  for (const match of content.matchAll(ENV_VAR_PATTERN)) {
    matches.add(match[1] ?? "");
  }
  return [...matches].sort();
};

export const replaceHomepageEnvVariables = (
  content: string,
  values: Record<string, string>,
): string =>
  content.replaceAll(ENV_VAR_PATTERN, (full, varName: string) => values[varName] ?? full);
