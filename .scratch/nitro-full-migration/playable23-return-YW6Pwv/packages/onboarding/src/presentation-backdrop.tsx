import type { ReactNode } from "react";

import classes from "./onboarding-studio.module.css";

export function OnboardingBackdropView({ marquee }: { marquee: ReactNode }) {
  return (
    <div className={classes.marqueeBackdrop} aria-hidden>
      <div className={`${classes.marqueeRail} ${classes.marqueeRailLeft}`}>{marquee}</div>
      <div className={`${classes.marqueeRail} ${classes.marqueeRailRight}`}>{marquee}</div>
    </div>
  );
}
