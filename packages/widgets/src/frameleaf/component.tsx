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
// Retain only cooldown deadlines across widget remounts, never media or authorization decisions.
const retryDeadlines = new Map<string, number>();
const maxTimerDelay = 2_147_483_647;
function cooldownUntil(itemId: string) {
  const until = retryDeadlines.get(itemId) ?? 0;
  if (until <= Date.now()) {
    retryDeadlines.delete(itemId);
    return 0;
  }
  return until;
}
function rememberCooldown(itemId: string, header: string | null) {
  const milliseconds =
    header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - Date.now() : NaN;
  const delay = Number.isNaN(milliseconds) ? 30000 : Math.max(30000, milliseconds);
  for (const [id, until] of retryDeadlines) if (until <= Date.now()) retryDeadlines.delete(id);
  retryDeadlines.set(itemId, Math.max(cooldownUntil(itemId), Date.now() + delay));
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
    let objectUrl: string | undefined;
    let total = 0;
    let failure: "privateOnly" | "unavailable" | "reconnect" | "rateLimit" = "unavailable";
    const cleanup = () => {
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    const cooldown = cooldownUntil(itemId);
    if (cooldown) {
      setPhoto(null);
      setError("rateLimit");
      timer = setTimeout(() => setRefresh((current) => current + 1), Math.min(maxTimerDelay, cooldown - Date.now()));
      return cleanup;
    }
    const requireSuccessAsync = async (response: Response) => {
      if (response.ok) return;
      if (response.status === 429) {
        rememberCooldown(itemId, response.headers.get("retry-after"));
        failure = "rateLimit";
        await response.body?.cancel();
      } else {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        failure = response.status === 403 ? "privateOnly" : body?.error === "reconnect" ? "reconnect" : "unavailable";
      }
      throw new Error("Frameleaf media request failed");
    };
    const request = {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      signal: controller.signal,
    } as const;
    setPhoto(null);
    void (async () => {
      const response = await fetch(
        `/api/integrations/frameleaf/widget?${new URLSearchParams({ itemId, page: String(page) })}`,
        request,
      );
      await requireSuccessAsync(response);
      const data = (await response.json()) as Photo;
      if (controller.signal.aborted) return;
      if (data.imageUrl) {
        const url = new URL(data.imageUrl, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== "/api/integrations/frameleaf/widget/image")
          throw new Error("Invalid private image URL");
        const image = await fetch(data.imageUrl, request);
        await requireSuccessAsync(image);
        const blob = await image.blob();
        if (controller.signal.aborted) return;
        if (blob.type !== "image/jpeg" || blob.size > 5 * 1024 * 1024) throw new Error("Invalid private image");
        objectUrl = URL.createObjectURL(blob);
      }
      total = data.total;
      setPhoto({ ...data, imageUrl: objectUrl ?? null });
      setError(null);
      if (total > 0 && page > total) setPage(1);
    })()
      .catch(() => {
        if (!controller.signal.aborted) {
          setPhoto(null);
          setError(failure);
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        const delay = Math.max(30000, cooldownUntil(itemId) - Date.now());
        timer = setTimeout(
          () => {
            if (!cooldownUntil(itemId) && playing && total > 1) setPage((current) => (current % total) + 1);
            else setRefresh((current) => current + 1);
          },
          Math.min(maxTimerDelay, delay),
        );
      });
    return cleanup;
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
                if (photo.imageUrl) URL.revokeObjectURL(photo.imageUrl);
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
