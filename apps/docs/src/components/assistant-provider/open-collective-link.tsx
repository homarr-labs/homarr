import Translate from "@docusaurus/Translate";

import styles from "./open-collective-link.module.css";

export const OpenCollectiveLink = () => (
  <a className={styles.link} href="https://opencollective.com/homarr">
    <img className={styles.logo} src="/img/opencollective.svg" alt="" aria-hidden />
    <Translate id="workshop.provider.donate">Donate to Homarr on OpenCollective</Translate>
  </a>
);
