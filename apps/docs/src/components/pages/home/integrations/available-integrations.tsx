import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

import { SectionContainer } from "@/components/pages/home/container/section-container";
import { supportedIntegrations } from "@/constants/supported-integrations";

export const AvailableIntegrations = () => {
  const featuredIntegrations = supportedIntegrations.filter(({ name }) => name !== "Homarr").slice(0, 12);

  return (
    <SectionContainer className="my-16 sm:my-20">
      <section className="border bg-fd-card p-6 sm:p-8" aria-labelledby="integrations-title">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 id="integrations-title" className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">
              Many integrations built in
            </h2>
            <p className="mb-0 mt-4 leading-7 text-fd-muted-foreground">
              Browse supported integrations and their setup instructions.
            </p>
            <Link
              className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-fd-primary hover:underline"
              href="/docs/integrations"
            >
              Browse supported integrations
              <IconArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-6 gap-2" aria-label="Examples of supported integrations">
            {featuredIntegrations.map(({ name, iconUrl }) => (
              <div
                key={name}
                className="flex aspect-square items-center justify-center border bg-fd-muted/35 p-2 sm:p-3"
                title={name}
              >
                <img className="size-7 object-contain sm:size-10" src={iconUrl} alt={name} width={40} height={40} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </SectionContainer>
  );
};
