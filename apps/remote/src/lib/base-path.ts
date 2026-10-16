export const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");
export const appHome = `${appBasePath}/`;
export function appUrl(path: string): string {
  return `${appBasePath}${path}`;
}
