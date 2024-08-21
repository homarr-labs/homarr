import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrIframeDefinition
  extends CommonOldmarrWidgetDefinition<
    "iframe",
    {
      embedUrl: string;
      allowFullScreen: boolean;
      allowScrolling: boolean;
      allowTransparency: boolean;
      allowPayment: boolean;
      allowAutoPlay: boolean;
      allowMicrophone: boolean;
      allowCamera: boolean;
      allowGeolocation: boolean;
    }
  > {}
