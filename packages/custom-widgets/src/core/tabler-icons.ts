import { iconsList } from "@tabler/icons-react";
import tablerPackage from "@tabler/icons-react/package.json";

export const customJsxTablerIconNames = Object.freeze([...iconsList.default, "pulse"].toSorted());

export const customJsxTablerIconExamples = [
  "server",
  "database",
  "bell",
  "cloud",
  "circle-check",
  "air-conditioning",
  "brand-github",
  "star-filled",
] as const;

export const customJsxTablerIconSpriteBasePath = `/tabler-icons/${tablerPackage.version}`;
