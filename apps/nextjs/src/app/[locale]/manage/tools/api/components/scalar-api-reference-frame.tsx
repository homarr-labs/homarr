"use client";

import { useLocale } from "next-intl";

import styles from "./scalar-api-reference-frame.module.css";

export function ScalarApiReferenceFrame() {
  const locale = useLocale();

  return <iframe className={styles.frame} src={`/${locale}/reference/api`} title="Homarr API documentation" />;
}
