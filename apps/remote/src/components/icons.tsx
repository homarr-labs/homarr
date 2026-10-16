import type { CSSProperties } from "react";
import {
  IconArrowRight,
  IconBrandGithub,
  IconCheck,
  IconKey,
  IconLink,
  IconLock,
  IconPlus,
  IconRefresh,
  IconServer,
  IconTrash,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";

export function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "brand-mark brand-mark-small" : "brand-mark"} aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M6 25V7h6v6h8V7h6v18h-6v-7h-8v7z" fill="currentColor" />
      </svg>
    </span>
  );
}

const glyphs = {
  server: IconServer,
  key: IconKey,
  user: IconUser,
  arrow: IconArrowRight,
  lock: IconLock,
  plus: IconPlus,
  github: IconBrandGithub,
  link: IconLink,
  check: IconCheck,
  refresh: IconRefresh,
  trash: IconTrash,
  globe: IconWorld,
};

export function Glyph({ name, size = 20, style }: { name: keyof typeof glyphs; size?: number; style?: CSSProperties }) {
  const Icon = glyphs[name];
  return <Icon size={size} stroke={1.7} aria-hidden="true" style={style} />;
}
