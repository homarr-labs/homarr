import Image from "next/image";

import type { TitleOrder } from "@homarr/ui";
import { Group, Title } from "@homarr/ui";

interface LogoProps {
  size: number;
  src: string;
  alt: string;
  shouldUseNextImage?: boolean;
}

export const Logo = ({
  size = 60,
  shouldUseNextImage = false,
  src,
  alt,
}: LogoProps) =>
  shouldUseNextImage ? (
    <Image src={src} alt={alt} width={size} height={size} />
  ) : (
    // we only want to use next/image for logos that we are sure will be preloaded and are allowed
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} />
  );

const logoWithTitleSizes = {
  lg: { logoSize: 48, titleOrder: 1 },
  md: { logoSize: 32, titleOrder: 2 },
  sm: { logoSize: 24, titleOrder: 3 },
} satisfies Record<string, { logoSize: number; titleOrder: TitleOrder }>;

export interface LogoWithTitleProps {
  size: keyof typeof logoWithTitleSizes;
  title: string;
  image: Omit<LogoProps, "size">;
}

export const LogoWithTitle = ({ size, title, image }: LogoWithTitleProps) => {
  const { logoSize, titleOrder } = logoWithTitleSizes[size];

  return (
    <Group gap="xs" wrap="nowrap">
      <Logo {...image} size={logoSize} />
      <Title order={titleOrder}>{title}</Title>
    </Group>
  );
};
