interface FocusMobileBoardSectionOptions {
  anchorId: string;
  reduceMotion: boolean;
}

export const focusMobileBoardSection = ({ anchorId, reduceMotion }: FocusMobileBoardSectionOptions): boolean => {
  const heading = document.getElementById(anchorId);
  if (!heading) return false;

  heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  heading.focus({ preventScroll: true });
  return true;
};
