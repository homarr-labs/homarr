export interface LinkedDockerContainer {
  endpointId: string;
  name: string;
}

// Container names cannot contain "@" but endpoint ids can, so the name goes first. The name survives recreating a
// container on update, the id does not.
const separator = "@";

export const formatLinkedDockerContainer = ({ endpointId, name }: LinkedDockerContainer) =>
  `${name}${separator}${endpointId}`;

export const parseLinkedDockerContainer = (value: string): LinkedDockerContainer | null => {
  const separatorIndex = value.indexOf(separator);
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;
  return { name: value.slice(0, separatorIndex), endpointId: value.slice(separatorIndex + 1) };
};

interface SuggestionApp {
  name: string;
  href: string | null;
  pingUrl: string | null;
}

interface SuggestionContainer {
  name: string;
  ports?: { PublicPort?: number }[];
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const parseUrl = (value: string | null) => {
  if (!value) return [];
  try {
    return [new URL(value)];
  } catch {
    return [];
  }
};

// Apps behind a reverse proxy share at most their name or subdomain with the container, so a published port is the
// weakest hint.
const scoreContainer = (app: SuggestionApp, container: SuggestionContainer) => {
  const name = normalizeName(container.name);
  if (normalizeName(app.name) === name) return 3;
  const urls = [...parseUrl(app.href), ...parseUrl(app.pingUrl)];
  if (urls.some((url) => normalizeName(url.hostname.split(".")[0] ?? "") === name)) return 2;
  const ports = new Set(container.ports?.map((port) => port.PublicPort));
  if (urls.some((url) => url.port && ports.has(Number(url.port)))) return 1;
  return 0;
};

export const suggestDockerContainer = <TContainer extends SuggestionContainer>(
  app: SuggestionApp,
  containers: TContainer[],
): { container: TContainer; isCertain: boolean } | null => {
  let best: TContainer | null = null;
  let bestScore = 0;
  let isTied = false;
  for (const container of containers) {
    const score = scoreContainer(app, container);
    if (score > bestScore) {
      best = container;
      bestScore = score;
      isTied = false;
    } else if (score > 0 && score === bestScore) {
      isTied = true;
    }
  }
  return isTied || !best ? null : { container: best, isCertain: bestScore > 1 };
};
