export interface AppInsertValues {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly iconUrl: string;
  readonly href: string | null;
  readonly pingUrl?: string | null;
}

export type AppMutation = {
  readonly kind: "create";
  readonly values: AppInsertValues;
};

export type AppMutationResult = AppInsertValues & { readonly appId: string };

export class AppMutationPreconditionError extends Error {
  readonly code = "APP_MUTATION_PRECONDITION";

  constructor() {
    super("App mutation precondition failed");
    this.name = "AppMutationPreconditionError";
  }
}

export class AppMutationPermissionError extends Error {
  readonly code = "APP_MUTATION_PERMISSION";

  constructor() {
    super("Missing app-create permission");
    this.name = "AppMutationPermissionError";
  }
}

export const captureAppMutation = (input: AppMutation): AppMutation => {
  if (input.kind !== "create") throw new AppMutationPreconditionError();
  const values = input.values;
  let pingUrl = values.pingUrl;
  if (pingUrl === "") pingUrl = null;
  return Object.freeze({
    kind: "create",
    values: Object.freeze({
      id: values.id,
      name: values.name,
      description: values.description,
      iconUrl: values.iconUrl,
      href: values.href,
      pingUrl,
    }),
  });
};
