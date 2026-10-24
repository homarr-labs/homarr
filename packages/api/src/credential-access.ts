export interface CredentialAccessMeta {
  readOnly?: boolean;
}

export const isReadOnlyProcedure = (type: string, meta: unknown) =>
  type === "query" && !(typeof meta === "object" && meta !== null && "readOnly" in meta && meta.readOnly === false);
