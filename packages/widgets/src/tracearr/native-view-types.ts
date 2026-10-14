import type { ScopedTranslationFunction } from "@homarr/translation";
import type { formatDuration } from "@homarr/common";

export interface TracearrViewTextProps {
  t: ScopedTranslationFunction<"widget.tracearr">;
}

export interface TracearrViewDateProps extends TracearrViewTextProps {
  locale: string;
}

export interface TracearrViewDurationProps extends TracearrViewTextProps {
  formatDuration: typeof formatDuration;
}
