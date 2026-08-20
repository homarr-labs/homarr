export const invariantTechnicalLabels = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  os: "OS",
  id: "ID",
  url: "URL",
} as const;

export type InvariantTechnicalLabel = (typeof invariantTechnicalLabels)[keyof typeof invariantTechnicalLabels];
