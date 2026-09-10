import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import clsx from "clsx";
import Link from "@/components/mdx/link";
import styles from "../../../../pages/index.module.css";
import { HeroCards } from "./hero-cards";

export default function HomeHero() {
  return (
    <header className={clsx(styles.heroBanner, styles.hero)}>
      <div className={styles.heroContent}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>
            A simple, yet
            <br />
            powerful dashboard
            <br />
            for your server.
          </h1>
          <p className={styles.heroDescription}>
            A sleek, modern dashboard that puts all of your apps and services at your fingertips. Control everything in
            one convenient location. Seamlessly integrates with the apps you've added, providing you with valuable
            information.
          </p>

          <div className={styles.heroActions}>
            <Link data-attr="Install button" className={styles.heroButton} to="/docs/getting-started">
              <span>Install</span>
              <IconDownload aria-hidden="true" size={20} />
            </Link>
            <Link
              data-attr="Try demo button"
              className={styles.heroButton}
              to="https://demo.homarr.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Try Demo</span>
              <IconExternalLink aria-hidden="true" size={20} />
            </Link>
            <Link
              data-attr="Redirect to PikaPods"
              className={clsx(styles.heroButton, styles.partnerButton)}
              to="https://www.pikapods.com/pods?run=homarr-v1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/img/pictures/partner/pika-pods.svg" alt="PikaPods" height={20} />
              <span>Host from $2.3/month</span>
            </Link>
          </div>
        </div>
        <section className={clsx(styles.heroPreview, "hover-animation")} aria-label="Example Homarr dashboard">
          <HeroCards />
        </section>
      </div>
    </header>
  );
}
