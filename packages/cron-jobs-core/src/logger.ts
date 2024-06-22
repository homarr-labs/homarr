export interface Logger {
  logDebug: (message: string) => void;
  logInfo: (message: string) => void;
  logError: (error: unknown) => void;
}

export class ConsoleLogger implements Logger {
  logDebug(message: string) {
    console.log(message);
  }

  logInfo(message: string) {
    console.log(message);
  }

  logError(error: unknown) {
    console.error(error);
  }
}
