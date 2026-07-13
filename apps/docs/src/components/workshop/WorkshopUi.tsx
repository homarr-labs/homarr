import React, { type PropsWithChildren, useEffect, useRef } from "react";
import Link from "@docusaurus/Link";
import { IconBooks, IconCloudOff, IconRefresh } from "@tabler/icons-react";

import styles from "./workshop.module.css";

export function WorkshopServiceState({
  cached,
  message,
  onRetry,
}: {
  cached: boolean;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <section className={styles.serviceState} aria-live="polite">
      <span className={styles.serviceStateIcon} aria-hidden>
        <IconCloudOff size={24} />
      </span>
      <div>
        <h2>{cached ? "Browsing saved creations" : "Workshop is taking a break"}</h2>
        <p>
          {message ??
            (cached
              ? "The catalog saved on this device is still available. Live details and community actions will return when the service reconnects."
              : "Community creations cannot be reached right now. Homarr and its documentation remain fully available.")}
        </p>
        <div className={styles.serviceStateActions}>
          <button className="button button--primary button--sm" onClick={onRetry}>
            <IconRefresh size={16} /> Check again
          </button>
          <Link className="button button--secondary button--sm" to="/docs/management/workshop">
            <IconBooks size={16} /> Read the guide
          </Link>
        </div>
      </div>
    </section>
  );
}

export function WorkshopDialog({
  titleId,
  onClose,
  children,
}: PropsWithChildren<{ titleId: string; onClose: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogSurface}>{children}</div>
    </dialog>
  );
}
