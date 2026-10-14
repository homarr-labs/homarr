import { useState } from "react";
import {
  Avatar,
  Group,
  Image,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  VisuallyHidden,
} from "@mantine/core";

import type { MediaDisplayItem, MediaTableProps } from "./contracts";
import { MediaActions } from "./media-actions";

export interface MediaPreviewProps {
  readonly media: Pick<MediaDisplayItem, "id" | "name">;
  readonly url: string;
  readonly height?: number;
  readonly width?: number | "100%";
}

export function MediaPreview({ media, url, height = 64, width = 64 }: MediaPreviewProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (failedUrl === url)
    return (
      <Text size="xs" w={width} h={height}>
        Preview unavailable
      </Text>
    );
  return <Image src={url} alt={media.name} w={width} h={height} fit="contain" onError={() => setFailedUrl(url)} />;
}

export function MediaTable(props: MediaTableProps) {
  return (
    <TableScrollContainer minWidth={680}>
      <Table striped highlightOnHover>
        <TableThead>
          <TableTr>
            <TableTh>
              <VisuallyHidden>Preview</VisuallyHidden>
            </TableTh>
            <TableTh>Name</TableTh>
            <TableTh>Size</TableTh>
            <TableTh>Creator</TableTh>
            <TableTh>
              <VisuallyHidden>Actions</VisuallyHidden>
            </TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {props.items.map((media) => (
            <TableTr key={media.id} data-selected={props.selectedId === media.id || undefined}>
              <TableTd w={64}>
                <MediaPreview media={media} url={props.createLocalImageUrl(media.id)} />
              </TableTd>
              <TableTh scope="row" style={{ overflowWrap: "anywhere" }}>
                {media.name}
              </TableTh>
              <TableTd>{props.formatSize(media.size)}</TableTd>
              <TableTd>
                {media.creator ? (
                  <Group gap="sm">
                    {props.renderCreator?.(media.creator) ?? (
                      <>
                        <Avatar
                          src={media.creator.image}
                          alt={media.creator.name ?? ""}
                          name={media.creator.name ?? undefined}
                          color="initials"
                          size="sm"
                        />
                        <Text size="sm">{media.creator.name ?? "-"}</Text>
                      </>
                    )}
                  </Group>
                ) : (
                  "-"
                )}
              </TableTd>
              <TableTd w={64}>
                <MediaActions
                  media={media}
                  url={props.createLocalImageUrl(media.id)}
                  canShowDelete={props.canShowDelete(media)}
                  deleteUnavailableReason={props.deleteUnavailableReason}
                  selectedId={props.selectedId}
                  onSelect={props.onSelect}
                />
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </TableScrollContainer>
  );
}
