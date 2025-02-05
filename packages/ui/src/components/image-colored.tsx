import { getThemeColor, MantineColor, useMantineTheme } from "@mantine/core";

interface ImageColoredProps {
  src: string;
  color: MantineColor;
  alt: string;
  styles?: React.CSSProperties;
  className?: string;
}

export const ImageColored = ({ src, color, alt, styles, className }: ImageColoredProps) => {
  const theme = useMantineTheme();

  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{
        ...styles,
        backgroundColor: getThemeColor(color, theme),
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskImage: `url(${src})`,
      }}
    />
  );
};
