export interface Notification {
  id: string;
  /** Time the notification was received. */
  time: Date;
  title: string;
  body: string;
}
