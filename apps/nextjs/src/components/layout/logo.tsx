import Image from "next/image";
import { Group, Title } from "@mantine/core";

interface LogoProps {
  size: number;
}

export const Logo = ({ size = 60 }: LogoProps) => (
  <Image src="/logo/homarr.png" alt="homarr logo" width={size} height={size} />
);

export const LogoWithTitle = () => (
  <Group gap={0}>
    <Logo size={48} />
    <Title order={1}>lparr</Title>
  </Group>
);
