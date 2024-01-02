import Image from "next/image";

import type { TitleOrder } from "@homarr/ui";
import { Group, Title } from "@homarr/ui";

interface LogoProps {
  size: number;
}

export const Logo = ({ size = 60 }: LogoProps) => (
  <Image src="/logo/homarr.png" alt="Homarr logo" width={size} height={size} />
);

const logoWithTitleSizes = {
  lg: { logoSize: 48, titleOrder: 1 },
  md: { logoSize: 32, titleOrder: 2 },
  sm: { logoSize: 24, titleOrder: 3 },
} satisfies Record<string, { logoSize: number; titleOrder: TitleOrder }>;

interface LogoWithTitleProps {
  size: keyof typeof logoWithTitleSizes;
}

export const LogoWithTitle = ({ size }: LogoWithTitleProps) => {
  const { logoSize, titleOrder } = logoWithTitleSizes[size];

  return (
    <Group gap={0} wrap="nowrap">
      <Logo size={logoSize} />
      <Title order={titleOrder}>lparr</Title>
    </Group>
  );
};
