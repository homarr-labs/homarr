import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";

import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { isYouTubeUrl, VideoNativeView } from "../video/native-view";
import classes from "../video/component.module.css";

import "video.js/dist/video-js.css";

export default function NativeVideoResourceRenderer({ options, isEditMode }: WidgetComponentProps<"video">) {
  if (options.feedUrl.trim() === "") return <NoUrl />;
  if (isYouTubeUrl(options.feedUrl)) return <ForYoutubeUseIframe />;
  return <Feed options={options} isEditMode={isEditMode} />;
}

function NoUrl() {
  const t = useI18n("widget.video");
  return <VideoNativeView state="no-url" message={t("error.noUrl")} />;
}

function ForYoutubeUseIframe() {
  const t = useI18n("widget.video");
  const tCommon = useI18n("common");
  return (
    <VideoNativeView
      state="youtube"
      message={t("error.forYoutubeUseIframe")}
      documentationHref={createDocumentationLink("/docs/widgets/iframe")}
      documentationLabel={tCommon("action.checkoutDocs")}
    />
  );
}

function Feed({ options, isEditMode }: Pick<WidgetComponentProps<"video">, "options"> & { isEditMode: boolean }) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player>(null);

  useEffect(() => {
    if (playerRef.current) return;
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    if (classes.video) videoElement.classList.add(classes.video);
    videoRef.current?.appendChild(videoElement);
    playerRef.current = videojs(videoElement, {
      autoplay: options.hasAutoPlay,
      muted: options.isMuted,
      controls: options.hasControls,
      sources: [{ src: options.feedUrl }],
    });
  }, [videoRef, options.feedUrl, options.hasAutoPlay, options.isMuted, options.hasControls]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.src(options.feedUrl);
  }, [options.feedUrl]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.autoplay(options.hasAutoPlay);
  }, [options.hasAutoPlay]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.muted(options.isMuted);
  }, [options.isMuted]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.controls(!isEditMode && options.hasControls);
  }, [isEditMode, options.hasControls]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return <VideoNativeView state="feed" isEditMode={isEditMode} videoRef={videoRef} />;
}
