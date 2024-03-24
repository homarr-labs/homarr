export function parseCookies(cookieString: string) {
  const list: Record<string, string> = {};
  const cookieHeader = cookieString;
  if (!cookieHeader) return list;

  cookieHeader.split(`;`).forEach(function (cookie) {
    const items = cookie.split(`=`);
    let name = items.shift();
    name = name?.trim();
    if (!name) return;
    const value = items.join(`=`).trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });

  return list;
}
