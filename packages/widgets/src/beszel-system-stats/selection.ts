export interface BeszelSystemChoice {
  value: string;
  label: string;
  integrationId: string;
  systemId: string;
}

interface BeszelSystemsResult {
  integrationId: string;
  integrationName: string;
  systems: { id: string; name: string }[];
}

export function createBeszelSystemChoices(results: BeszelSystemsResult[]): BeszelSystemChoice[] {
  const includeIntegrationName = results.length > 1;
  return results.flatMap((result) =>
    result.systems.map((system) => ({
      value: `${result.integrationId}:${system.id}`,
      label: includeIntegrationName ? `${result.integrationName} · ${system.name}` : system.name,
      integrationId: result.integrationId,
      systemId: system.id,
    })),
  );
}

export function resolveBeszelSystemChoice(choices: BeszelSystemChoice[], storedValue: string) {
  const exactMatch = choices.find((choice) => choice.value === storedValue);
  if (exactMatch) return exactMatch;
  if (storedValue === "") return choices[0];

  const legacyMatches = choices.filter((choice) => choice.systemId === storedValue);
  return legacyMatches.length === 1 ? legacyMatches[0] : undefined;
}

export function resolveStoredBeszelQuerySelection(storedValue: string, integrationIds: readonly string[]) {
  for (const integrationId of integrationIds) {
    const prefix = `${integrationId}:`;
    if (storedValue.startsWith(prefix)) {
      return { integrationIds: [integrationId], systemId: storedValue.slice(prefix.length) };
    }
  }

  if (storedValue !== "" && integrationIds.length === 1) {
    return { integrationIds: [integrationIds[0] as string], systemId: storedValue };
  }

  return null;
}
