const legacyDocsPath = /^(?:\.\.\/)+(integrations|management|widgets)\/(.+)$/;

export const getDocsHref = (path: string) => {
  const match = legacyDocsPath.exec(path);
  return match ? `/docs/${match[1]}/${match[2]}` : path;
};
