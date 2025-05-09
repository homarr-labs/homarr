import { formatMetadata } from "./metadata";

/**
 * Formats the cause of an error in the format
 * @example caused by Error: {message}
 * {stack-trace}
 * @param cause next cause in the chain
 * @param iteration current iteration of the function
 * @returns formatted and stacked causes
 */
export const formatErrorCause = (cause: unknown, iteration = 0): string => {
  // Prevent infinite recursion
  if (iteration > 5) {
    return "";
  }

  if (cause instanceof Error) {
    if (!cause.cause) {
      return `\ncaused by ${formatErrorTitle(cause)}\n${formatErrorStack(cause.stack)}`;
    }

    return `\ncaused by ${formatErrorTitle(cause)}\n${formatErrorStack(cause.stack)}${formatErrorCause(cause.cause, iteration + 1)}`;
  }

  if (cause instanceof Object) {
    return `\ncaused by ${JSON.stringify(cause)}`;
  }

  return `\ncaused by ${cause as string}`;
};

const ignoredErrorProperties = ["stack", "message", "name", "cause"];

/**
 * Formats the title of an error
 * @example {name}: {message} {metadata}
 * @param error error to format title from
 * @returns formatted error title
 */
export const formatErrorTitle = (error: Error) => {
  const title = error.message.length === 0 ? error.name : `${error.name}: ${error.message}`;
  const metadata = formatMetadata(error, ignoredErrorProperties);

  return `${title} ${metadata}`;
};

/**
 * Formats the stack trance of an error
 * We remove the first line as it contains the error name and message
 * @param stack stack trace
 * @returns formatted stack trace
 */
export const formatErrorStack = (stack: string | undefined) => (stack ? removeFirstLine(stack) : "");
const removeFirstLine = (stack: string) => stack.split("\n").slice(1).join("\n");
