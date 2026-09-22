import type { IconNode, SvgElementName } from "@tabler/icons-react";
import { createReactComponent } from "@tabler/icons-react";
import { parseSync } from "svgson";

import { capitalize } from "@homarr/common";

interface CustomIconOptions {
  name: string;
  svgContent: string;
  type: "outline" | "filled";
}

const svgElementNames: ReadonlySet<string> = new Set<SvgElementName>([
  "animate",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tspan",
  "use",
  "view",
]);

const isSvgElementName = (value: string): value is SvgElementName => svgElementNames.has(value);

export const createCustomIcon = ({ svgContent, type, name }: CustomIconOptions) => {
  const icon = parseSync(svgContent);

  const children = icon.children.map(({ name, attributes }, i) => {
    if (!isSvgElementName(name)) throw new Error(`Unsupported SVG element: ${name}`);
    attributes.key = `svg-${i}`;

    attributes.strokeWidth = attributes["stroke-width"] ?? "2";
    delete attributes["stroke-width"];

    return [name, attributes] satisfies IconNode[number];
  });

  const pascalCaseName = `Icon${capitalize(name.replace("-", ""))}`;
  return createReactComponent(type, name, pascalCaseName, children);
};
