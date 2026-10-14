import type { ReactNode } from "react";
import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { MediaActions, MediaPreview, MediaTable } from "../../source-ui/media";

import { canDeleteSourceMedia } from "./access";
import type {
  SourceMediaBindings,
  SourceMediaItem,
  SourceMediaPrincipal,
  SourceMediaSelection,
  SourceMediaView,
} from "./contracts";
import { sourceMediaMutations } from "./contracts";

export interface SourceMediaGalleryProps {
  readonly items: readonly SourceMediaItem[];
  readonly bindings: SourceMediaBindings;
  readonly principal: SourceMediaPrincipal;
  readonly readOnly: boolean;
  readonly includeFromAllUsers?: boolean;
  readonly view: SourceMediaView;
  readonly selectedId?: string;
  readonly onSelect?: (selection: SourceMediaSelection) => void;
  readonly byteUnitSystem?: "binary" | "decimal";
  readonly renderCreator?: (creator: NonNullable<SourceMediaItem["creator"]>) => ReactNode;
}

export function SourceMediaGallery(props: SourceMediaGalleryProps) {
  if (props.principal.kind !== "authenticated") return null;
  const userId = props.principal.user.id;
  const includeFromAllUsers = props.includeFromAllUsers && props.principal.user.permissions.includes("media-view-all");
  const items = includeFromAllUsers ? props.items : props.items.filter((media) => media.creatorId === userId);
  if (props.view === "list") {
    return (
      <MediaTable
        items={items}
        createLocalImageUrl={props.bindings.createLocalImageUrl}
        formatSize={(size) => props.bindings.formatBytes(size, { unit: props.byteUnitSystem })}
        canShowDelete={(media) => canDeleteSourceMedia(props.principal, media, props.readOnly)}
        deleteUnavailableReason={sourceMediaMutations.delete.reason}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        renderCreator={props.renderCreator}
      />
    );
  }
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
      {items.map((media) => (
        <Paper key={media.id} withBorder p="sm" radius="md">
          <Stack gap="sm">
            <MediaPreview media={media} url={props.bindings.createLocalImageUrl(media.id)} height={160} width="100%" />
            <Text fw={600} style={{ overflowWrap: "anywhere" }}>
              {media.name}
            </Text>
            <Text size="sm">
              {props.bindings.formatBytes(media.size, { unit: props.byteUnitSystem })} · {media.creator?.name ?? "-"}
            </Text>
            <MediaActions
              media={media}
              url={props.bindings.createLocalImageUrl(media.id)}
              canShowDelete={canDeleteSourceMedia(props.principal, media, props.readOnly)}
              deleteUnavailableReason={sourceMediaMutations.delete.reason}
              selectedId={props.selectedId}
              onSelect={props.onSelect}
            />
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
