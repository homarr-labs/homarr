export const appendPath = (url: URL | string, path: string) => {
  const newUrl = new URL(url);
  newUrl.pathname = removeTrailingSlash(newUrl.pathname) + path;
  return newUrl;
};

const removeTrailingSlash = (path: string) => {
  return path.at(-1) === "/" ? path.substring(0, path.length - 1) : path;
};
