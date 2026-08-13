const hexColorPattern = /^#[0-9a-f]{6}$/iu;

export const recolorWordmark = (
  svg: string,
  primaryColor: string,
  secondaryColor: string,
  foregroundColor?: string,
) => {
  if (!hexColorPattern.test(primaryColor) || !hexColorPattern.test(secondaryColor)) return svg;

  return svg.replace(/fill="(#[0-9a-f]{6})"/giu, (fill, color: string) => {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    const redDifference = red - Math.max(green, blue);

    if (foregroundColor && hexColorPattern.test(foregroundColor) && Math.min(red, green, blue) >= 235) {
      return `fill="${foregroundColor}"`;
    }
    if (redDifference < 15) return fill;
    return `fill="${Math.min(green, blue) >= 150 ? secondaryColor : primaryColor}"`;
  });
};
