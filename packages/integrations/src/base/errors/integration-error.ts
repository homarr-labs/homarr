export interface IntegrationErrorData {
  id: string;
  name: string;
  url: string | URL;
}

export abstract class IntegrationError extends Error {
  public readonly integrationId: string;
  public readonly integrationName: string;
  public readonly integrationUrl: string;

  constructor(integration: IntegrationErrorData, message: string, { cause }: ErrorOptions) {
    super(message, { cause });
    this.integrationId = integration.id;
    this.integrationName = integration.name;
    this.integrationUrl = integration.url.toString();
  }
}
