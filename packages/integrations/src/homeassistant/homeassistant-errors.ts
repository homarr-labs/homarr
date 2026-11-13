export class SmartHomeActionNotSupportedError extends Error {
  public constructor(entityId: string, actionType: string) {
    super(`Action ${actionType} is not supported for ${entityId}`);
    this.name = "SmartHomeActionNotSupportedError";
  }
}

export class SmartHomeEntityNotFoundError extends Error {
  public constructor(entityId: string) {
    super(`Entity ${entityId} was not found`);
    this.name = "SmartHomeEntityNotFoundError";
  }
}

export class HomeAssistantCommandError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly translationKey?: string,
  ) {
    super(message);
    this.name = "HomeAssistantCommandError";
  }
}

export class HomeAssistantConfigurationChangedError extends Error {
  public constructor() {
    super("Home Assistant integration configuration changed; reconnect with the current configuration");
    this.name = "HomeAssistantConfigurationChangedError";
  }
}
