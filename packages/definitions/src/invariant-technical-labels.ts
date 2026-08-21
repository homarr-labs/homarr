export const invariantTechnicalLabels = {
  cpu: "CPU",
  docker: "Docker",
  gpu: "GPU",
  ram: "RAM",
  os: "OS",
  id: "ID",
  json: "JSON",
  jsonSchema: "JSON Schema",
  jsx: "JSX",
  url: "URL",
} as const;

export type InvariantTechnicalLabel = (typeof invariantTechnicalLabels)[keyof typeof invariantTechnicalLabels];
