interface PublishableWorkshopDefinition {
  sources: Record<string, { name?: string; networkScope: string }>;
}

export const serializeWorkshopDefinition = (definition: unknown): string => {
  const serialized = JSON.stringify(definition);
  if (serialized === undefined) throw new Error("Workshop definition is not serializable");
  return serialized;
};

export const workshopDefinitionChanged = (previous: unknown, current: unknown) =>
  serializeWorkshopDefinition(previous) !== serializeWorkshopDefinition(current);

export const getPrivateWorkshopSourceNames = (definition: PublishableWorkshopDefinition | undefined) =>
  Object.entries(definition?.sources ?? {}).flatMap(([sourceId, source]) =>
    source.networkScope === "public" ? [] : [source.name ?? sourceId],
  );
