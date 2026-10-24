"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Center,
  Image,
  Loader,
  Stack,
  Text,
  parseThemeColor,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconCube } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { useWidgetNow } from "../../common/use-widget-now";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import { getRenderedSize } from "../common/rendered-size";
import { canShowThingportHeader, ThingportWidgetHeader } from "../common/widget-header";
import classes from "./component.module.css";

const ThingportModelViewer = dynamic(() => import("./model-viewer").then((module) => module.ThingportModelViewer), {
  ssr: false,
});

const pad = (value: number) => String(value).padStart(2, "0");
const toLocalDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function ThingportFeaturedModelWidget({
  integrationIds,
  options,
  isEditMode,
  widgetRuntimeRef,
  ...sizeProps
}: WidgetComponentProps<"thingport-featuredModel">) {
  const { width, height } = getRenderedSize(sizeProps);
  const t = useI18n("widget.thingport-featuredModel");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("dark");
  // Thingport picks one model a day; asking with the viewer's date moves it on at their midnight.
  const now = useWidgetNow("day");
  const input = { integrationId: integrationIds[0] ?? "", date: now ? toLocalDate(now) : "" };
  const query = clientApi.widget.thingport.getFeaturedModel.useQuery(input, { enabled: now !== null });
  const model = getUsableWidgetQueryData(query);
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.thingport.getFeaturedModel, input, "query")]);
  const [failedMeshUrl, setFailedMeshUrl] = useState<string | null>(null);
  const [loadedMeshUrl, setLoadedMeshUrl] = useState<string | null>(null);

  if (now === null || isInitialWidgetQueryPending(query)) return <WidgetQueryLoadingState />;

  if (!model) {
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {t("empty")}
        </Text>
      </Center>
    );
  }

  const href = getSafeApplicationUrl(model.href);
  const linkProps = {
    href,
    target: options.openInNewTab ? "_blank" : undefined,
    rel: options.openInNewTab ? SAFE_NEW_TAB_REL : undefined,
  };
  const open = () => {
    if (!href || isEditMode) return;
    if (options.openInNewTab) window.open(href, "_blank", "noopener,noreferrer");
    else window.location.assign(href);
  };
  const mesh = model.mesh && model.mesh.url !== failedMeshUrl ? model.mesh : null;
  const color = parseThemeColor({ color: theme.primaryColor, theme, colorScheme }).value;
  const meta = [model.author, t("views", { count: model.viewCount }), t("prints", { count: model.printCount })]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={classes.root}>
      {options.showTitle && canShowThingportHeader(width, height) && <ThingportWidgetHeader title={t("title")} />}

      <div className={classes.stage} title={mesh ? t("hint") : undefined}>
        {mesh ? (
          <>
            <ThingportModelViewer
              url={mesh.url}
              format={mesh.format}
              color={color}
              autoRotate={options.autoRotate}
              onOpen={open}
              onLoaded={() => setLoadedMeshUrl(mesh.url)}
              onError={() => setFailedMeshUrl(mesh.url)}
            />
            {loadedMeshUrl !== mesh.url && (
              <Center pos="absolute" inset={0} style={{ pointerEvents: "none" }}>
                <Loader size="sm" />
              </Center>
            )}
          </>
        ) : model.thumbnailUrl ? (
          <a {...linkProps} aria-label={model.name} className={classes.thumbnailLink}>
            <Image src={model.thumbnailUrl} alt="" fit="contain" h="100%" />
          </a>
        ) : (
          <Center h="100%">
            <Stack gap={4} align="center">
              <IconCube size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="xs" ta="center">
                {t("noPreview")}
              </Text>
            </Stack>
          </Center>
        )}
      </div>

      {options.showDetails && (
        <a {...linkProps} className={classes.details}>
          <Text size="sm" fw={500} truncate="end" title={model.name}>
            {model.name}
          </Text>
          <Text size="xs" c="dimmed" truncate="end">
            {meta}
          </Text>
        </a>
      )}
    </div>
  );
}
