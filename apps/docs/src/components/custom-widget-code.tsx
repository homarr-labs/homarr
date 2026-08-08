import BrowserOnly from "@docusaurus/BrowserOnly";

import {
  BundledCustomWidgetGalleryClient,
  CanonicalCustomWidgetExampleClient,
  CustomWidgetCodeInputClient,
  CustomWidgetCodeExampleClient,
} from "./custom-widget-code-client";

export interface CustomWidgetCodeExampleProps {
  id: string;
  label: string;
  code: string;
  language?: "json" | "jsx";
  height?: string;
}

export interface CustomWidgetCodeInputProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  language: "json" | "css";
  description?: string;
  placeholder?: string;
  height?: string;
  required?: boolean;
  maxLength?: number;
}

export interface CanonicalCustomWidgetExampleProps {
  id: string;
  label: string;
  example: "requests" | "options";
  height?: string;
}

export function CanonicalCustomWidgetExample(props: CanonicalCustomWidgetExampleProps) {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height={props.height} />}>
      {() => <CanonicalCustomWidgetExampleClient {...props} />}
    </BrowserOnly>
  );
}

export function CustomWidgetCodeExample(props: CustomWidgetCodeExampleProps) {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height={props.height} />}>
      {() => <CustomWidgetCodeExampleClient {...props} />}
    </BrowserOnly>
  );
}

export function CustomWidgetCodeInput(props: CustomWidgetCodeInputProps) {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height={props.height} />}>
      {() => <CustomWidgetCodeInputClient {...props} />}
    </BrowserOnly>
  );
}

export function BundledCustomWidgetGallery() {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height="520px" />}>
      {() => <BundledCustomWidgetGalleryClient />}
    </BrowserOnly>
  );
}

function CodeExampleFallback({ height }: { height?: string }) {
  return (
    <div
      style={{
        minHeight: height ?? "220px",
        border: "1px solid var(--ifm-color-emphasis-300)",
        borderRadius: "var(--ifm-global-radius)",
        background: "var(--ifm-background-surface-color)",
      }}
      aria-busy="true"
    />
  );
}
