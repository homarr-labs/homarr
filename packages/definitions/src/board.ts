export const backgroundImageAttachments = ["fixed", "scroll"] as const;
export const backgroundImageRepeats = [
  "repeat",
  "repeat-x",
  "repeat-y",
  "no-repeat",
] as const;
export const backgroundImageSizes = ["cover", "contain"] as const;

export type BackgroundImageAttachment =
  (typeof backgroundImageAttachments)[number];
export type BackgroundImageRepeat = (typeof backgroundImageRepeats)[number];
export type BackgroundImageSize = (typeof backgroundImageSizes)[number];
