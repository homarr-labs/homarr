import { IntegrationMarquee } from "@homarr/ui";

import classes from "./onboarding-studio.module.css";

export const OnboardingBackdrop = () => (
  <div className={classes.marqueeBackdrop} aria-hidden>
    <div className={`${classes.marqueeRail} ${classes.marqueeRailLeft}`}>
      <IntegrationMarquee />
    </div>
    <div className={`${classes.marqueeRail} ${classes.marqueeRailRight}`}>
      <IntegrationMarquee />
    </div>
  </div>
);
