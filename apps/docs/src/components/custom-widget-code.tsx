import BrowserOnly from "@docusaurus/BrowserOnly";
import { lazy, Suspense } from "react";

export interface CustomWidgetCodeExampleProps {
  id: string;
  label: string;
  code: string;
  language?: "json" | "jsx";
  height?: string;
}

export interface CanonicalCustomWidgetExampleProps {
  id: string;
  label: string;
  example: "requests" | "optionsSchema" | "defaultOptions";
  height?: string;
}

const LazyCanonicalCustomWidgetExample = lazy(async () => {
  const module = await import("./custom-widget-code-client");
  return { default: module.CanonicalCustomWidgetExampleClient };
});

const LazyCustomWidgetCodeExample = lazy(async () => {
  const module = await import("./custom-widget-code-client");
  return { default: module.CustomWidgetCodeExampleClient };
});

const LazyBundledCustomWidgetGallery = lazy(async () => {
  const module = await import("./custom-widget-code-client");
  return { default: module.BundledCustomWidgetGalleryClient };
});

export function CanonicalCustomWidgetExample(props: CanonicalCustomWidgetExampleProps) {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height={props.height} />}>
      {() => (
        <Suspense fallback={<CodeExampleFallback height={props.height} />}>
          <LazyCanonicalCustomWidgetExample {...props} />
        </Suspense>
      )}
    </BrowserOnly>
  );
}

export function CustomWidgetCodeExample(props: CustomWidgetCodeExampleProps) {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height={props.height} />}>
      {() => (
        <Suspense fallback={<CodeExampleFallback height={props.height} />}>
          <LazyCustomWidgetCodeExample {...props} />
        </Suspense>
      )}
    </BrowserOnly>
  );
}

export function BundledCustomWidgetGallery() {
  return (
    <BrowserOnly fallback={<CodeExampleFallback height="520px" />}>
      {() => (
        <Suspense fallback={<CodeExampleFallback height="520px" />}>
          <LazyBundledCustomWidgetGallery />
        </Suspense>
      )}
    </BrowserOnly>
  );
}

function CodeExampleFallback({ height }: { height?: string }) {
  return <div style={{ minHeight: height ?? "220px" }} aria-busy="true" />;
}
