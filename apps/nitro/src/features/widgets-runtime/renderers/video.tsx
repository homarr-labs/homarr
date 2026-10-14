import { lazy, Suspense, useEffect, useState } from "react";

import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { WidgetQueryLoadingState } from "@homarr/widgets/common/native-read-rendering";

const VideoResourceRenderer = lazy(() => import("@homarr/widgets/common/native-video-renderer"));

export function NativeVideoRenderer(props: WidgetComponentProps<"video">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <WidgetQueryLoadingState />;
  return (
    <Suspense fallback={<WidgetQueryLoadingState />}>
      <VideoResourceRenderer {...props} />
    </Suspense>
  );
}
