import { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";
import clsx from "clsx";

import type { WorkshopAssistantActivity } from "@homarr/workshop/schema";
import { workshopAssistantActivitySchema } from "@homarr/workshop/schema";

import { getWorkshopBackend } from "@site/src/lib/pocketbase";
import { getRuntimeWorkshopApiUrl } from "@site/src/lib/runtime-config";

import styles from "./assistant-provider-activity.module.css";

const statusIcon = {
  processing: IconLoader2,
  completed: IconCheck,
  failed: IconX,
};

const statusLabel = {
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const activityDate = (value: string) => new Date(value.includes("T") ? value : value.replace(" ", "T"));

const mergeActivity = (current: WorkshopAssistantActivity[], next: WorkshopAssistantActivity) =>
  [next, ...current.filter((item) => item.id !== next.id)]
    .toSorted((left, right) => activityDate(right.created).getTime() - activityDate(left.created).getTime())
    .slice(0, 10);

const mergeActivities = (current: WorkshopAssistantActivity[], next: WorkshopAssistantActivity[]) =>
  next.reduce(mergeActivity, current);

const getEmptyLabel = (loading: boolean, loadFailed: boolean, connected: boolean) => {
  if (loading) return "Loading recent activity…";
  if (loadFailed) return connected ? "Waiting for live provider activity…" : "Recent provider activity is unavailable.";
  return "No provider requests yet today.";
};

export const AssistantProviderActivity = ({ compact = false }: { compact?: boolean }) => {
  const { siteConfig } = useDocusaurusContext();
  const configuredWorkshopUrl = (siteConfig.customFields?.workshopUrl as string | undefined) ?? "";
  const [activities, setActivities] = useState<WorkshopAssistantActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [connected, setConnected] = useState(false);
  const workshopUrl = useMemo(() => getRuntimeWorkshopApiUrl(configuredWorkshopUrl), [configuredWorkshopUrl]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const backend = getWorkshopBackend(workshopUrl);
    const load = async () => {
      try {
        const nextUnsubscribe = await backend.pocketBase.collection("assistant_activity").subscribe("*", (event) => {
          const parsed = workshopAssistantActivitySchema.safeParse(event.record);
          if (!active || !parsed.success) return;
          setConnected(true);
          setActivities((current) => mergeActivity(current, parsed.data));
        });
        if (active) {
          unsubscribe = nextUnsubscribe;
          setConnected(true);
        } else {
          nextUnsubscribe();
        }
      } catch {
        if (active) setConnected(false);
      }
      try {
        const initial = await backend.listAssistantActivity(10);
        if (active) {
          setActivities((current) => mergeActivities(current, initial));
          setLoadFailed(false);
        }
      } catch {
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [workshopUrl]);

  const visibleActivities = compact ? activities.slice(0, 3) : activities;

  return (
    <section className={clsx(styles.root, compact && styles.compact)} aria-label="Live Homarr provider activity">
      <header className={styles.header}>
        <h3 className={styles.title}>Homarr provider activity</h3>
        <span className={styles.live} data-connected={connected || undefined} aria-live="polite">
          <span className={styles.beep} aria-hidden />
          {connected ? "Live" : loading ? "Connecting" : "Offline"}
        </span>
      </header>
      {visibleActivities.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Requests</th>
                <th>Tokens</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {visibleActivities.map((activity) => {
                const StatusIcon = statusIcon[activity.status];
                return (
                  <tr key={activity.id}>
                    <td>
                      <time dateTime={activity.created} title={activityDate(activity.created).toLocaleString()}>
                        {activityDate(activity.created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </td>
                    <td>
                      <span className={styles.status} data-status={activity.status}>
                        <StatusIcon size={13} aria-hidden />
                        {statusLabel[activity.status]}
                      </span>
                    </td>
                    <td>{activity.requestUnits.toLocaleString()}</td>
                    <td>{activity.totalTokens > 0 ? activity.totalTokens.toLocaleString() : "–"}</td>
                    <td>{activity.durationMs > 0 ? `${(activity.durationMs / 1000).toFixed(1)} s` : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.empty}>{getEmptyLabel(loading, loadFailed, connected)}</div>
      )}
    </section>
  );
};
