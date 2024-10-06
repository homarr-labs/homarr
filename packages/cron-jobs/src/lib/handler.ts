import { hashKey } from "@tanstack/query-core";
import dayjs from "dayjs";
import type { Duration } from "dayjs/plugin/duration";
import SuperJSON from "superjson";

import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import type { Integration, IntegrationSecret } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";

import type { IntegrationKind, WidgetKind } from "../../../definitions/src";
import { createIntegrationOptionsChannel } from "../../../redis/src/lib/channel";
import type { inferSupportedIntegrationsStrict } from "../../../widgets/src";
import { reduceWidgetOptionsWithDefaultValues } from "../../../widgets/src";
import type { WidgetOptionsRecordOf } from "../../../widgets/src/definition";

type IntegrationOfKind<TKind extends IntegrationKind> = Omit<Integration, "kind"> & {
  kind: TKind;
  secrets: Pick<IntegrationSecret, "kind" | "value">[];
};

interface Options<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> {
  // Unique key for this request handler
  queryKey: string;
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput) => Promise<TData>;
  cacheDuration: Duration;
}

export const createCachedRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  return (integrationId: string, input: TInput) => {
    const channel = createIntegrationOptionsChannel<TData>(integrationId, options.queryKey, input);

    return {
      async getCachedOrUpdatedDataAsync(integration: IntegrationOfKind<TKind>, { forceUpdate = false }) {
        const channelData = await channel.getAsync();

        const shouldRequestNewData =
          forceUpdate ||
          !channelData ||
          dayjs().diff(channelData.timestamp, "milliseconds") > options.cacheDuration.asMilliseconds();

        if (shouldRequestNewData) {
          const data = await options.requestAsync(integration, input);
          await channel.publishAndUpdateLastStateAsync(data);
          return data;
        }

        return channelData.data;
      },
      subscribe(callback: (data: TData) => void) {
        return channel.subscribe(callback);
      },
    };
  };
};

export const createIntegrationWidgetHandlerJob = <
  TWidgetKind extends WidgetKind,
  TIntegrationKind extends inferSupportedIntegrationsStrict<TWidgetKind>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THandler extends ReturnType<typeof createCachedRequestHandler<any, TIntegrationKind, any>>,
>(
  handler: THandler,
  {
    widgetKinds,
    getInput,
  }: {
    widgetKinds: TWidgetKind[];
    getInput: {
      [key in TWidgetKind]: (options: WidgetOptionsRecordOf<key>) => Parameters<THandler>[1];
    };
  },
) => {
  return async () => {
    const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
      kinds: widgetKinds,
    });

    const distinctIntegrations: {
      integrationId: string;
      inputHash: string;
      integration: (typeof itemsForIntegration)[number]["integrations"][number]["integration"];
      input: Parameters<THandler>[1];
    }[] = [];

    for (const itemForIntegration of itemsForIntegration) {
      const input = getInput[itemForIntegration.kind](
        reduceWidgetOptionsWithDefaultValues(SuperJSON.parse(itemForIntegration.options)),
      );

      for (const { integration } of itemForIntegration.integrations) {
        const inputHash = Buffer.from(hashKey([input])).toString("base64");
        if (
          distinctIntegrations.some(
            (distinctIntegration) =>
              distinctIntegration.integrationId === integration.id && distinctIntegration.inputHash === inputHash,
          )
        ) {
          continue;
        }

        distinctIntegrations.push({ integrationId: integration.id, inputHash, integration, input });
      }
    }

    for (const { integrationId, integration, input } of distinctIntegrations) {
      try {
        const innerHandler = handler(integrationId, input);
        await innerHandler.getCachedOrUpdatedDataAsync(integration as never, { forceUpdate: true });
      } catch (error) {
        logger.error(error);
      }
    }
  };
};

export const createIntegrationWidgetHandlerRouter = <
  TWidgetKind extends WidgetKind,
  TIntegrationKind extends inferSupportedIntegrationsStrict<TWidgetKind>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THandler extends ReturnType<typeof createCachedRequestHandler<any, TIntegrationKind, any>>,
>(
  handler: THandler,
  {
    widgetKinds: _,
  }: {
    widgetKinds: TWidgetKind[];
  },
) => {
  return async <TInput extends Parameters<THandler>[1]>(
    integrations: IntegrationOfKind<TIntegrationKind>[],
    input: TInput,
  ): Promise<
    {
      integrationId: string;
      input: TInput;
      data: Awaited<ReturnType<ReturnType<THandler>["getCachedOrUpdatedDataAsync"]>> | undefined;
    }[]
  > => {
    return await Promise.all(
      integrations.map(async (integration) => {
        try {
          const innerHandler = handler(integration.id, input);

          return {
            integrationId: integration.id,
            input,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            data: await innerHandler.getCachedOrUpdatedDataAsync(integration, { forceUpdate: false }),
          };
        } catch (error) {
          logger.error(error);
          return { integrationId: integration.id, input, data: undefined };
        }
      }),
    );
  };
};
