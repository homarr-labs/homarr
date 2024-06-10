export const appendPath = (url: URL | string, path: string) => {
  const newUrl = new URL(url);
  newUrl.pathname += path;
  return newUrl;
};
