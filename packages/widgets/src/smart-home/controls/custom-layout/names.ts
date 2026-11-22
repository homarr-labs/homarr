/** Catalog entity names read "Entity · Device": the part before the device, and the device. */
export const splitEntityName = (name: string) => {
  const [title = name, ...rest] = name.split(" · ");
  return { title, subtitle: rest.join(" · ") };
};

/** The entity's name without its device, e.g. "Power"; templates match entities across devices by it. */
export const getShortName = (entity: { name: string }) => splitEntityName(entity.name).title;
