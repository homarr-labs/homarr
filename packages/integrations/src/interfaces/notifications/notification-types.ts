export interface Notification {
  id: string;
  time: Date;
  title: string;
  body: string;
  contentType?: string;
  href?: string;
  source?: {
    name: string;
    iconUrl?: string;
  };
}
