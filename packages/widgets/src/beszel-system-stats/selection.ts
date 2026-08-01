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
  return (
    choices.find((choice) => choice.value === storedValue) ??
    choices.find((choice) => choice.systemId === storedValue) ??
    choices[0]
  );
}
