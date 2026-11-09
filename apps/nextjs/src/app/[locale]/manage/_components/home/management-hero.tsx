"use client";

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Box, Text, Title } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";

import { useI18n } from "@homarr/translation/client";
import { IntegrationMarquee } from "@homarr/ui";

import { PlayableLobster } from "../lobster/playable-lobster";
import classes from "./management-home.module.css";
import { Seabed } from "./seabed";

interface Bubble {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

const ambientBubbles = [
  { left: 58, size: 6, delay: 0, duration: 11 },
  { left: 63, size: 10, delay: 4, duration: 13 },
  { left: 70, size: 5, delay: 7, duration: 10 },
  { left: 91, size: 8, delay: 2, duration: 12 },
  { left: 96, size: 5, delay: 9, duration: 11 },
];

const reactions = ["hey", "ow", "snip", "careful", "stillHere", "okay"] as const;
const maxBubbles = 24;

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

const createBubbles = (startId: number, amount: number): Bubble[] =>
  Array.from({ length: amount }, (_, index) => ({
    id: startId + index,
    left: 25 + Math.random() * 50,
    size: 4 + Math.random() * 9,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 1.2,
    drift: (Math.random() - 0.5) * 60,
  }));

interface ManagementHeroProps {
  appName: string;
  userName: string | null;
}

export const ManagementHero = ({ appName, userName }: ManagementHeroProps) => {
  const t = useI18n("management.page.home");
  const [pokes, setPokes] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const hero = useRef<HTMLElement>(null);
  const nextId = useRef(0);
  const reducedMotion = useReducedMotion();

  const handlePoke = () => {
    setPokes((current) => current + 1);
    if (reducedMotion) return;
    const fresh = createBubbles(nextId.current, 8);
    nextId.current += fresh.length;
    setBubbles((current) => [...current, ...fresh].slice(-maxBubbles));
  };

  const removeBubble = (id: number) => setBubbles((current) => current.filter((bubble) => bubble.id !== id));

  const handleMove = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === "touch" || !hero.current) return;
    const rect = hero.current.getBoundingClientRect();
    hero.current.style.setProperty("--px", String(((event.clientX - rect.left) / rect.width - 0.5) * 2));
    hero.current.style.setProperty("--py", String(((event.clientY - rect.top) / rect.height - 0.5) * 2));
  };

  const handleLeave = () => {
    hero.current?.style.setProperty("--px", "0");
    hero.current?.style.setProperty("--py", "0");
  };

  const reaction = reactions[(pokes - 1) % reactions.length] ?? "hey";

  return (
    <Box
      component="section"
      ref={hero}
      className={classes.hero}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className={classes.rays} aria-hidden="true" />
      <div className={classes.marquee} aria-hidden="true">
        <IntegrationMarquee />
      </div>
      {ambientBubbles.map((bubble) => (
        <span
          key={bubble.left}
          className={classes.ambientBubble}
          aria-hidden="true"
          style={cssVars({
            "--left": `${bubble.left}%`,
            "--size": `${bubble.size}px`,
            "--delay": `${bubble.delay}s`,
            "--duration": `${bubble.duration}s`,
          })}
        />
      ))}
      <Seabed />
      <Box className={classes.copy} py={{ base: 0, md: "lg" }}>
        <Title order={1} className={classes.title}>
          {t("hero.greeting")} <span className={classes.name}>{userName ?? t("hero.fallbackName")}</span>
        </Title>
        <Text c="dimmed" size="lg" mt="sm" maw={420}>
          {t("hero.description", { app: appName })}
        </Text>
      </Box>
      <div className={classes.stage}>
        {pokes > 0 && (
          <span key={pokes} className={classes.waves} aria-hidden="true">
            <span className={classes.wave} />
            <span className={classes.wave} />
          </span>
        )}
        <PlayableLobster size="100%" label={t("lobster.label")} onPoke={handlePoke} />
        <div className={classes.bubbles} aria-hidden="true">
          {bubbles.map((bubble) => (
            <span
              key={bubble.id}
              className={classes.bubble}
              onAnimationEnd={() => removeBubble(bubble.id)}
              style={cssVars({
                "--left": `${bubble.left}%`,
                "--size": `${bubble.size}px`,
                "--delay": `${bubble.delay}s`,
                "--duration": `${bubble.duration}s`,
                "--drift": `${bubble.drift}px`,
              })}
            />
          ))}
        </div>
        <output className={classes.speech}>
          <span key={pokes} className={classes.speechInner}>
            {pokes === 0 && (
              <Text span size="sm" fw={600}>
                {t("lobster.prompt")}
              </Text>
            )}
            {pokes > 0 && (
              <>
                <Text span size="sm" fw={600}>
                  {t(`lobster.reaction.${reaction}`)}
                </Text>
                <Text span size="xs" c="dimmed">
                  {t("lobster.pokeCount", { count: pokes })}
                </Text>
              </>
            )}
          </span>
        </output>
      </div>
    </Box>
  );
};
