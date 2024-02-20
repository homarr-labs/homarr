void (async () => {
  const { logger } = await import("./index.mjs");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
  const nextLogger = require("next/dist/build/output/log");

  const getWinstonMethodForConsole = (consoleMethod) => {
    switch (consoleMethod) {
      case "error":
        return (...messages) => logger.error(messages.join(" "));
      case "warn":
        return (...messages) => logger.warn(messages.join(" "));
      case "debug":
        return (...messages) => logger.debug(messages.join(" "));
      case "log":
      case "info":
      default:
        return (...messages) => logger.info(messages.join(" "));
    }
  };

  const consoleMethods = ["log", "debug", "info", "warn", "error"];
  consoleMethods.forEach((method) => {
    console[method] = getWinstonMethodForConsole(method);
  });

  const getWinstonMethodForNext = (nextMethod) => {
    switch (nextMethod) {
      case "error":
        return (...messages) => logger.error(messages.join(" "));
      case "warn":
        return (...messages) => logger.warn(messages.join(" "));
      case "trace":
        return (...messages) => logger.info(messages.join(" "));
      default:
        return (...messages) => logger.info(messages.join(" "));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  Object.keys(nextLogger.prefixes).forEach((method) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    nextLogger[method] = getWinstonMethodForNext(method);
  });
})();
