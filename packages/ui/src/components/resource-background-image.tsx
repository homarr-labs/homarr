"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { BackgroundImage } from "@mantine/core";
import type { BackgroundImageProps } from "@mantine/core";

import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

type ResourceBackgroundImageProps = BackgroundImageProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof BackgroundImageProps>;
const transparentImage = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export const ResourceBackgroundImage = forwardRef<HTMLDivElement, ResourceBackgroundImageProps>(
  function ResourceBackgroundImage({ src, ...props }, ref) {
    const resolvedSource = useWorkerResourceUrl(src);
    return <BackgroundImage {...props} ref={ref} src={resolvedSource ?? transparentImage} />;
  },
);
