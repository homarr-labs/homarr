import classes from "./onboarding-studio.module.css";

export const OnboardingWordmark = () => (
  <img
    src="/logo/homarr-wordmark-light.svg"
    alt="Homarr"
    className={`${classes.wordmark} ${classes.onboardingWordmark}`}
  />
);
