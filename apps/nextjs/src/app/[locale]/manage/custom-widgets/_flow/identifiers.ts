export function freshFlowIdentifier(entries: Record<string, unknown>, prefix: string) {
  let count = 1;
  while (Object.hasOwn(entries, `${prefix.slice(0, 55)}${count}`)) count += 1;
  return `${prefix.slice(0, 55)}${count}`;
}
