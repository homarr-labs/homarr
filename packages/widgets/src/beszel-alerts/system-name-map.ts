interface BeszelSystemNamesByIntegration {
  integrationId: string;
  systemNameMap: Record<string, string>;
}

export const getBeszelSystemNameKey = (integrationId: string, systemId: string) => `${integrationId}:${systemId}`;

export const buildBeszelSystemNameMap = (results: readonly BeszelSystemNamesByIntegration[]) => {
  const systemNames = new Map<string, string>();

  for (const result of results) {
    for (const [systemId, systemName] of Object.entries(result.systemNameMap)) {
      systemNames.set(getBeszelSystemNameKey(result.integrationId, systemId), systemName);
    }
  }

  return systemNames;
};

export const getBeszelSystemName = (
  systemNames: ReadonlyMap<string, string>,
  integrationId: string,
  systemId: string,
) => systemNames.get(getBeszelSystemNameKey(integrationId, systemId)) ?? systemId;
