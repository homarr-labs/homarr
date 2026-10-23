import { ReleaseLookupError } from "./errors";

export interface OwnedName {
  owner: string;
  name: string;
}

const splitIdentifier = (identifier: string) => identifier.split("/").filter((part) => part.length > 0);

export const parseOwnedName = (identifier: string, format: string): OwnedName => {
  const [owner, name] = splitIdentifier(identifier);
  if (!owner || !name) throw new ReleaseLookupError("invalidIdentifier", `Cannot parse "${identifier}" as ${format}`);
  return { owner, name };
};

export const parseOwnedPackageName = (identifier: string, format: string): OwnedName => {
  const { owner } = parseOwnedName(identifier, format);
  return { owner, name: splitIdentifier(identifier).slice(1).join("/") };
};

export const encodeOwnedName = ({ owner, name }: OwnedName) =>
  `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

export const parseGithubRepositoryUrl = (url: string | null | undefined) => {
  if (!url || !URL.canParse(url)) return undefined;
  const { hostname, pathname } = new URL(url);
  const [owner, repository] = pathname.split("/").filter((part) => part.length > 0);
  if (hostname !== "github.com" || !owner || !repository) return undefined;
  return `${owner}/${repository.replace(/\.git$/, "")}`;
};
