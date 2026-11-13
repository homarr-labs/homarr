"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Group, Image, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

interface Photo {
  total: number;
  caption: string;
  imageUrl: string | null;
  libraryUrl: string;
}
export default function FrameleafWidget({ itemId, options, height }: WidgetComponentProps<"frameleaf-albumCarousel">) {
  const t = useI18n("widget.frameleaf-albumCarousel");
  const connection = useI18n("integration.frameleaf");
  const [page, setPage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<"privateOnly" | "unavailable" | "reconnect" | "rateLimit" | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setPage(1);
    setPhoto(null);
  }, [itemId, options.albumId]);
  useEffect(() => {
    if (!itemId || !options.albumId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retryAfter = 30;
    let total = 0;
    void fetch(`/api/integrations/frameleaf/widget?${new URLSearchParams({ itemId, page: String(page) })}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const failure = (await response.json()) as { error?: string };
          retryAfter = Math.max(30, Number(response.headers.get("retry-after")) || 30);
          if (!controller.signal.aborted) {
            setPhoto(null);
            setError(
              response.status === 403
                ? "privateOnly"
                : failure.error === "reconnect"
                  ? "reconnect"
                  : response.status === 429
                    ? "rateLimit"
                    : "unavailable",
            );
          }
          return;
        }
        const data = (await response.json()) as Photo;
        if (controller.signal.aborted) return;
        total = data.total;
        setPhoto(data);
        setError(null);
        if (total > 0 && page > total) setPage(1);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPhoto(null);
          setError("unavailable");
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        timer = setTimeout(() => {
          if (playing && total > 1) setPage((current) => (current % total) + 1);
          else setRefresh((current) => current + 1);
        }, retryAfter * 1000);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [itemId, options.albumId, page, playing, refresh]);
  if (!itemId || !options.albumId) return <Alert>{t("chooseAlbum")}</Alert>;
  return (
    <Stack h="100%" gap="xs" p="xs">
      {error ? (
        <Alert color="yellow">{error === "reconnect" ? connection("reconnect") : t(error)}</Alert>
      ) : !photo ? (
        <Text component="output">{t("loading")}</Text>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            {connection("connected")} · {t("count", { count: photo.total })}
          </Text>
          {photo.imageUrl ? (
            <Image
              key={photo.imageUrl}
              h={Math.max(50, height - 115)}
              fit="contain"
              src={photo.imageUrl}
              alt={photo.caption || t("imageAlt")}
              onError={() => {
                setPhoto(null);
                setError("unavailable");
              }}
            />
          ) : (
            <Text>{t("empty")}</Text>
          )}
          <Group gap="xs" justify="center">
            <Button
              size="compact-xs"
              variant="default"
              disabled={photo.total < 2}
              onClick={() => setPage((current) => (current <= 1 ? photo.total : current - 1))}
            >
              {t("previous")}
            </Button>
            <Button size="compact-xs" variant="default" onClick={() => setPlaying((current) => !current)}>
              {t(playing ? "pause" : "play")}
            </Button>
            <Button
              size="compact-xs"
              variant="default"
              disabled={photo.total < 2}
              onClick={() => setPage((current) => (current % photo.total) + 1)}
            >
              {t("next")}
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              component="a"
              href={photo.libraryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("openLibrary")}
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
