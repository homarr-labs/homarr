export const createMetaTitle = (name: string, appName?: string) => {
  if (appName) return `${name} • ${appName}`;
  return name;
};
