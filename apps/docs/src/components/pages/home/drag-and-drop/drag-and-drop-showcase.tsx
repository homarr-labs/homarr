"use client";

import { IconClick } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { SectionContainer } from "@/components/pages/home/container/section-container";
import { useColorMode } from "@/hooks/use-color-mode";

export const DragAndDropShowcase = () => {
  const { colorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);
  const video = `/videos/home/showcase-${mounted && colorMode === "dark" ? "dark" : "light"}.mp4`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="my-20 sm:my-24" aria-labelledby="drag-drop-title">
      <SectionContainer className="relative max-w-5xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 id="drag-drop-title" className="m-0 text-3xl font-bold tracking-tight sm:text-5xl">
            Easy setup using drag and drop
          </h2>
        </div>
        <div className="absolute right-0 top-8 hidden translate-x-6 text-fd-primary/35 lg:block" aria-hidden="true">
          <IconClick size={96} stroke={1.4} />
        </div>
        <div
          className="overflow-hidden rounded-2xl border-4 border-fd-primary bg-fd-muted"
          style={{ aspectRatio: "17.6/9" }}
        >
          <video
            className="h-full w-full object-cover"
            src={video}
            aria-label="Homarr drag-and-drop editor demonstration"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
      </SectionContainer>
    </section>
  );
};
