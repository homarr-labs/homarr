import type { Metadata } from "next";

import { SectionContainer } from "@/components/pages/home/container/section-container";
import { HomeDataflow } from "@/components/pages/home/dataflow/dataflow";
import { DocsGateway } from "@/components/pages/home/docs-gateway";
import { DragAndDropShowcase } from "@/components/pages/home/drag-and-drop/drag-and-drop-showcase";
import HomepageFeatures from "@/components/pages/home/features/features";
import HomeHero from "@/components/pages/home/hero/hero";
import { AvailableIntegrations } from "@/components/pages/home/integrations/available-integrations";
import HomepageUserReviews from "@/components/pages/home/review-list/review-list";
import { SiteFooter } from "@/components/site-footer";

import styles from "../../pages/index.module.css";

export const metadata: Metadata = {
  title: "A simple, powerful dashboard for your server",
  description:
    "Simplify the management of your server with Homarr, a sleek, modern dashboard that puts all of your apps and services at your fingertips.",
};

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <HomeHero />

      <svg
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 320"
        className={styles.heroWave}
      >
        <path
          fill="var(--ifm-color-primary)"
          d="M0,224L48,202.7C96,181,192,139,288,133.3C384,128,480,160,576,149.3C672,139,768,85,864,58.7C960,32,1056,32,1152,37.3C1248,43,1344,53,1392,58.7L1440,64L1440,0L0,0Z"
        />
      </svg>

      <SectionContainer>
        <HomepageFeatures />
      </SectionContainer>
      <DocsGateway />
      <HomeDataflow />
      <DragAndDropShowcase />
      <AvailableIntegrations />
      <SectionContainer>
        <HomepageUserReviews />
      </SectionContainer>

      <SiteFooter />
    </main>
  );
}
