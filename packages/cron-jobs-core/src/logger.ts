export interface Logger {
  logDebug(message: string): void;
  logInfo(message: string): void;
  logError(error: unknown): void;
  logWarning(message: string): void;
}

export class ConsoleLogger implements Logger {
  public logDebug(message: string) {
    console.log(message);
  }

  public logInfo(message: string) {
    console.log(message);
  }

  public logError(error: unknown) {
    console.error(error);
  }

  public logWarning(message: string) {
    console.warn(message);
  }
}
