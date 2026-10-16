"use client";

import { useLocale } from "next-intl";

import { useResourceWorkerId } from "@homarr/worker-client/resources";

import { ScalarApiReference } from "./scalar-api-reference";

import styles from "./scalar-api-reference-frame.module.css";

export function ScalarApiReferenceFrame() {
  const locale = useLocale();
  const workerId = useResourceWorkerId();
  if (workerId) return <ScalarApiReference />;

  return <iframe className={styles.frame} src={`/${locale}/reference/api`} title="Homarr API documentation" />;
}
