import { WidgetDefinition } from "@site/src/types";
import { IconBrowser } from "@tabler/icons-react";

export const iframeWidget: WidgetDefinition = {
  icon: IconBrowser,
  name: "iFrame",
  description: "Embed any content from the internet. Some websites may restrict access.",
  path: "../../widgets/iframe",
  configuration: {
    items: [
      {
        name: "Embed URL",
        description: "The URL of the content to embed in the widget.",
        values: "Any valid URL",
        defaultValue: "-",
      },
      {
        name: "Allow full screen",
        description: "Whether to allow the embedded content to be displayed in full screen mode.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Allow scrolling",
        description: "Whether to allow the embedded content to be scrolled.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Allow payment",
        description: "Whether to allow the embedded content to process payments.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Allow auto play",
        description: "Whether to allow the embedded content to auto play media.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Allow microphone",
        description: "Whether to allow the embedded content to access the microphone.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Allow camera",
        description: "Whether to allow the embedded content to access the camera.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Allow geolocation",
        description: "Whether to allow the embedded content to access the geolocation.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
