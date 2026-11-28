"use client";

import type { ComponentType } from "react";
import { lazy, Suspense, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { ErrorBoundary } from "react-error-boundary";

import { useI18n } from "@homarr/translation/client";

export const LazyLoadFeedback = ({ onRetry }: { onRetry?: () => void }) => {
  const t = useI18n("common");
  if (!onRetry) {
    return (
      <Text component="output" display="block" size="sm" c="dimmed" py="xs">
        {t("action.loading")}…
      </Text>
    );
  }

  return (
    <Group gap="xs" py="xs">
      <Text role="alert" size="sm">
        {t("loadError")}
      </Text>
      <Button size="compact-sm" variant="light" onClick={onRetry}>
        {t("action.tryAgain")}
      </Button>
    </Group>
  );
};

export const createRetryableLazyContent = <Props extends object>(load: () => Promise<ComponentType<Props>>) => {
  const createComponent = () => lazy(async () => ({ default: await load() }));
  let latestComponent = createComponent();

  return function RetryableLazyContent(props: Props) {
    const mounted = useMounted();
    const [Content, setContent] = useState(() => latestComponent);
    if (!mounted) return null;

    return (
      <ErrorBoundary
        resetKeys={[Content]}
        fallback={
          <LazyLoadFeedback
            onRetry={() => {
              // React.lazy caches rejections, so retry with a fresh lazy component.
              latestComponent = createComponent();
              setContent(latestComponent);
            }}
          />
        }
      >
        <Suspense fallback={<LazyLoadFeedback />}>
          <Content {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
};
