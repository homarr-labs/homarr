import type { TitleOrder } from "@mantine/core";
import { Box, Group, Title } from "@mantine/core";

interface LogoProps {
  size: number;
}

export const homarrLogoPath = "/logo/logo.png";
export const homarrPageTitle = "BizerOS Dash";

export const HomarrLogo = ({ size }: LogoProps) => (
  <Box
    className="logo"
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.2,
      background: "linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: 700,
      fontSize: size * 0.45,
      lineHeight: 1,
      letterSpacing: "-0.02em",
      flexShrink: 0,
    }}
    aria-label={`${homarrPageTitle} logo`}
  >
    BD
  </Box>
);

const logoWithTitleSizes = {
  lg: { logoSize: 48, titleOrder: 1 },
  md: { logoSize: 32, titleOrder: 2 },
  sm: { logoSize: 24, titleOrder: 3 },
} satisfies Record<string, { logoSize: number; titleOrder: TitleOrder }>;

interface CommonLogoWithTitleProps {
  size: keyof typeof logoWithTitleSizes;
}

export const HomarrLogoWithTitle = ({ size }: CommonLogoWithTitleProps) => {
  const { logoSize, titleOrder } = logoWithTitleSizes[size];

  return (
    <Group gap="xs" wrap="nowrap">
      <HomarrLogo size={logoSize} />
      <Title order={titleOrder} textWrap="nowrap">
        {homarrPageTitle}
      </Title>
    </Group>
  );
};
