"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Image } from "@mantine/core";
import type { ImageProps } from "@mantine/core";

import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

type ResourceImageProps = ImageProps & Omit<ComponentPropsWithoutRef<"img">, keyof ImageProps>;

/** Standard Homarr images use the selected worker for private media and proxy assets. */
export const ResourceImage = forwardRef<HTMLImageElement, ResourceImageProps>(function ResourceImage(
  { src, ...props },
  ref,
) {
  let source: string | undefined;
  if (typeof src === "string") source = src;
  const resolvedSource = useWorkerResourceUrl(source);
  const fallbackSource = useWorkerResourceUrl(props.fallbackSrc);
  return <Image {...props} fallbackSrc={fallbackSource} ref={ref} src={resolvedSource} />;
});
