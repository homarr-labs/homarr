"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Box } from "@mantine/core";
import { useDocumentVisibility, useIntersection } from "@mantine/hooks";
import { IconCamera, IconPlayerPlay, IconPlayerStop, IconRefresh } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

import { useSmartHomeInteractionBlock } from "./store";
import type { HaEntity } from "./types";
import classes from "./control-center/styles.module.css";
import { useEntityDetailOpener } from "./control-center/hooks";
import { readCameraFramesAsync } from "./camera-stream";
import { smartHomeActionIconVars } from "./control-center/theme";

export function CameraDetailsAction({ entity }: { entity: HaEntity }) {
  const t = useI18n("widget.smartHome-controls.camera");
  const open = useEntityDetailOpener(entity.id);
  if (!open) return null;
  return (
    <ActionIcon
      vars={smartHomeActionIconVars}
      variant="default"
      aria-label={t("controls", { name: entity.name })}
      onClick={open}
    >
      <IconCamera size={20} />
    </ActionIcon>
  );
}

export function CameraFeed({ entity }: { entity: HaEntity }) {
  const t = useI18n("widget.smartHome-controls.camera");
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [frameSource, setFrameSource] = useState<string | null>(null);
  const visibility = useDocumentVisibility();
  const { ref, entry } = useIntersection<HTMLDivElement>({ threshold: 0 });
  const editing = useSmartHomeInteractionBlock() === "editing";
  const unavailable = ["unavailable", "unknown", "off"].includes(entity.state);
  const active = requested && !editing && !unavailable && visibility === "visible" && entry?.isIntersecting === true;
  const picture = entity.attributes.snapshotUrl ?? entity.attributes.pictureUrl;
  const stream = entity.attributes.streamUrl;

  useEffect(() => {
    setFrameSource(null);
    if (!active || !stream) return;
    const controller = new AbortController();
    const frameReader = new FileReader();
    let disposed = false;
    let idleTimeout: number | undefined;
    const fail = () => {
      if (disposed) return;
      setRequested(false);
      setLoaded(false);
      setFailed(true);
      controller.abort();
    };
    frameReader.addEventListener("load", () => {
      if (!disposed && typeof frameReader.result === "string") setFrameSource(frameReader.result);
    });
    frameReader.addEventListener("error", fail);
    void fetch(`${stream}?view=${revision}`, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        await readCameraFramesAsync(response, (frame) => {
          if (disposed) return;
          window.clearTimeout(idleTimeout);
          idleTimeout = window.setTimeout(fail, 30_000);
          // CSP allows data: images, not blob:; skip frames while the previous one encodes.
          if (frameReader.readyState !== FileReader.LOADING) frameReader.readAsDataURL(frame);
        });
      })
      .catch(fail);
    return () => {
      disposed = true;
      controller.abort();
      frameReader.abort();
      window.clearTimeout(idleTimeout);
    };
  }, [active, stream, revision]);

  useEffect(() => {
    setLoaded(false);
    if (!active) return;
    // Renew the bounded server connection; each renewal checks current access.
    const reconnect = window.setInterval(() => {
      setLoaded(false);
      setRevision((value) => value + 1);
    }, 4 * 60_000);
    return () => window.clearInterval(reconnect);
  }, [active, stream]);

  useEffect(() => {
    if (!active || loaded) return;
    // First decoded frame deadline; the reader separately guards an already-live feed.
    const timeout = window.setTimeout(() => {
      setRequested(false);
      setFailed(true);
    }, 15_000);
    return () => window.clearTimeout(timeout);
  }, [active, loaded, revision]);

  useEffect(() => {
    setRequested(false);
    setFailed(false);
  }, [entity.id, stream, editing, unavailable]);

  let status = t("snapshot");
  let label = t("watch", { name: entity.name });
  let Icon = IconPlayerPlay;
  if (requested) {
    status = t("paused");
    label = t("stop", { name: entity.name });
    Icon = IconPlayerStop;
  }
  if (active) status = t("connecting");
  if (active && loaded) status = t("live");
  if (failed) {
    status = t("unavailable");
    label = t("retry", { name: entity.name });
    Icon = IconRefresh;
  }

  return (
    <Box ref={ref} pos="absolute" inset={0}>
      {picture ? (
        <img
          src={picture}
          alt={t("snapshotAlt", { name: entity.name })}
          className={classes.cameraImage}
          draggable={false}
        />
      ) : (
        <div className={classes.cameraEmpty}>
          <IconCamera size={32} />
        </div>
      )}
      {active && frameSource && (
        <img
          src={frameSource}
          alt={t("liveAlt", { name: entity.name })}
          className={classes.cameraImage}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setRequested(false);
            setLoaded(false);
            setFailed(true);
          }}
        />
      )}
      <output className={classes.liveBadge} data-live={active && loaded} title={status}>
        {status}
      </output>
      {stream && (
        <ActionIcon
          pos="absolute"
          top={2}
          right={2}
          vars={smartHomeActionIconVars}
          variant="filled"
          color="dark"
          aria-label={label}
          title={label}
          disabled={editing || unavailable}
          onClick={() => {
            setFailed(false);
            setRequested((value) => !value);
          }}
        >
          <Icon size={20} />
        </ActionIcon>
      )}
    </Box>
  );
}
