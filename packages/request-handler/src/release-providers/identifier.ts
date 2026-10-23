import { ReleaseLookupError } from "./errors";

export interface OwnedName {
  owner: string;
  name: string;
}

export const parseOwnedName = (identifier: string, format: string): OwnedName => {
  const [owner, ...nameParts] = identifier.split("/").filter((part) => part.length > 0);
  const name = nameParts.join("/");
  if (!owner || !name) throw new ReleaseLookupError("invalidIdentifier", `Cannot parse "${identifier}" as ${format}`);
  return { owner, name };
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
