export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: 1 | 2 = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export const requireCredentialsProvider = () => {
  const enabled = process.env.AUTH_PROVIDERS?.toLowerCase().includes("credentials") ?? false;
  if (!enabled) {
    throw new CliError("Credentials provider is not enabled");
  }
};
