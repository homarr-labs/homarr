import type { LoggerMessage } from "../../constants";
import type { LogAuthorizer } from "../log-history-stream";
import { LogHistoryStream } from "../log-history-stream";
import type { SampleHistoryResources } from "../sample-history-store";
import type { NitroHistoryBacking } from "./index";

class LifetimeLogHistoryStream extends LogHistoryStream {
  constructor(private readonly resources: NitroHistoryBacking) {
    super(resources.logs);
  }

  override async appendAsync(message: LoggerMessage, signal: AbortSignal): Promise<void> {
    await super.appendAsync(message, AbortSignal.any([signal, this.resources.signal]));
  }

  override async getRecentAsync(
    authorizer: LogAuthorizer,
    signal: AbortSignal,
    levels?: Parameters<LogHistoryStream["getRecentAsync"]>[2],
  ) {
    return await super.getRecentAsync(authorizer, AbortSignal.any([signal, this.resources.signal]), levels);
  }

  override subscribe(options: Parameters<LogHistoryStream["subscribe"]>[0]) {
    return super.subscribe({ ...options, signal: AbortSignal.any([options.signal, this.resources.signal]) });
  }
}

export const createNitroLogHistoryStream = (backing: NitroHistoryBacking): LogHistoryStream =>
  new LifetimeLogHistoryStream(backing);

export const bindNitroSampleHistoryResources = <TData>(
  backing: NitroHistoryBacking,
  resources: Omit<SampleHistoryResources<TData>, "backing">,
): SampleHistoryResources<TData> => {
  const authorizer = resources.authorizer;
  return {
    ...resources,
    backing: backing.samples,
    authorizer: {
      revoked: AbortSignal.any([authorizer.revoked, backing.signal]),
      requireAccessAsync: async (name, action, signal) => await authorizer.requireAccessAsync(name, action, signal),
    },
  };
};
