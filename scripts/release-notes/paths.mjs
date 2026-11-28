import { resolve } from "node:path";

export const repositoryRoot = resolve(import.meta.dirname, "../..");
export const skillDirectory = resolve(repositoryRoot, ".agents/skills/release-notes");
