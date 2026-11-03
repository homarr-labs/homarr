"use client";
import type { PropsWithChildren } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./frame.module.css";

const themes = {
  terminal: "Terminal Neon",
  matrix: "Matrix",
  midnight: "Midnight",
  light: "Minimal Light",
} as const;

type Theme = keyof typeof themes;
const themeKeys = Object.keys(themes) as Theme[];
const storageKey = "pablohflix.console.theme.v2";

export function PabloConsoleFrame({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>("terminal");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && themeKeys.includes(saved as Theme)) setTheme(saved as Theme);
    } catch {
      // The default theme remains usable if local storage is blocked.
    }
  }, []);

  const changeTheme = (value: Theme) => {
    setTheme(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Local persistence is optional.
    }
  };

  return (
    <div className={styles.shell} data-theme={theme}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">P/</span>
          <div>
            <div className={styles.title}>PabloHFlix <span>Console.</span></div>
            <div className={styles.tagline}>UNE CONSOLE. TOUS LES SYSTÈMES.</div>
          </div>
        </div>
        <nav className={styles.actions} aria-label="Navigation de la console">
          <Link className={styles.navLink} href="/">Widgets</Link>
          <Link className={styles.navLink} href="/manage/integrations">Intégrations</Link>
          <Link className={styles.navLink} href="/manage">Administration</Link>
          <label className={styles.themeLabel}>
            <span>THÈME</span>
            <select className={styles.themeSelect} aria-label="Thème de la console"
              value={theme} onChange={(event) => changeTheme(event.target.value as Theme)}>
              {themeKeys.map((key) => (
                <option key={key} value={key}>{themes[key]}</option>
              ))}
            </select>
          </label>
        </nav>
      </header>
      <div className={styles.content}>
        <div className={styles.sectionHeading}>
          <span>01 / LIVE MONITORING</span>
          <span className={styles.dataNote}>DONNÉES HOMARR · AUCUN CHIFFRE SIMULÉ</span>
        </div>
        <section className={styles.board} aria-label="Widgets de supervision">{children}</section>
      </div>
      <footer className={styles.footer}>
        <span>PABLOHFLIX // HOMARR ENGINE</span>
        <span>ACCÈS PRIVÉ · LAN / TAILSCALE</span>
      </footer>
    </div>
  );
}
