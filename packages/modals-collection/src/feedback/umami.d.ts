interface UmamiEventData {
  [key: string]: string | number | boolean;
}

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: UmamiEventData) => void;
    };
  }
}
