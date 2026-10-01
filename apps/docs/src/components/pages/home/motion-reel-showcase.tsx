import homarrV2SocialImage from "@site/public/media/homarr-home.webp";

import { SectionContainer } from "@/components/pages/home/container/section-container";

export const MotionReelShowcase = () => {
  return (
    <section className="my-20 sm:my-24" aria-labelledby="motion-reel-title">
      <SectionContainer className="relative max-w-5xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 id="motion-reel-title" className="m-0 text-3xl font-bold tracking-tight sm:text-5xl">
            Homarr showreel
          </h2>
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl border-4 border-fd-primary bg-fd-muted">
          <video
            className="h-full w-full"
            src="https://media.homarr.dev/videos/home/homarr-motion-reel.mp4"
            poster={homarrV2SocialImage.src}
            aria-label="Homarr 2.0 motion reel showing dashboards and integrations"
            controls
            playsInline
            preload="none"
          >
            <track kind="captions" src="/media/homepage-motion-reel.vtt" srcLang="en" label="English" />
          </video>
        </div>
      </SectionContainer>
    </section>
  );
};
