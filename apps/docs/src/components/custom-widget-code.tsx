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
  return <CanonicalCustomWidgetExampleClient {...props} />;
}

export function CustomWidgetCodeExample(props: CustomWidgetCodeExampleProps) {
  return <CustomWidgetCodeExampleClient {...props} />;
}

export function CustomWidgetCodeInput(props: CustomWidgetCodeInputProps) {
  return <CustomWidgetCodeInputClient {...props} />;
}

export function BundledCustomWidgetGallery() {
  return <BundledCustomWidgetGalleryClient />;
}
