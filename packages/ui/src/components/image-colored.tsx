import { getThemeColor, MantineColor, useMantineTheme } from "@mantine/core";

interface ImageColoredProps {
  src: string;
  color: MantineColor;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}

export const ImageColored = ({ src, color, alt, style, className }: ImageColoredProps) => {
  const theme = useMantineTheme();

  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{
        ...style,
        backgroundColor: getThemeColor(color, theme),
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskImage: `url(${src})`,
      }}
    />
  );
};
