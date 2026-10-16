"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Avatar } from "@mantine/core";
import type { AvatarProps } from "@mantine/core";

import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

type ResourceAvatarProps = AvatarProps & Omit<ComponentPropsWithoutRef<"div">, keyof AvatarProps>;

const ImageAvatar = forwardRef<HTMLDivElement, ResourceAvatarProps>(function ImageAvatar({ src, ...props }, ref) {
  const resolvedSource = useWorkerResourceUrl(src ?? undefined);
  return <Avatar {...props} ref={ref} src={resolvedSource} />;
});

export const ResourceAvatar = Object.assign(ImageAvatar, { Group: Avatar.Group });
