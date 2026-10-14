import { useEffect, useRef, useState } from "react";
import { Alert, Button, FileButton, Group, Image, Paper, Stack, Text, Title } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

import type { SourceMediaBindings } from "./contracts";
import { sourceMediaMutations } from "./contracts";

export type SourceMediaUploadPreparation =
  | { readonly kind: "empty" }
  | { readonly kind: "invalid"; readonly files: readonly File[] }
  | { readonly kind: "ready"; readonly body: FormData; readonly files: readonly File[] };

export function prepareSourceMediaUpload(
  files: readonly File[],
  bindings: Pick<SourceMediaBindings, "mediaUploadSchema">,
): SourceMediaUploadPreparation {
  if (files.length === 0) return { kind: "empty" };
  const body = new FormData();
  files.forEach((file) => body.append("files", file, file.name));
  const parsed = bindings.mediaUploadSchema.safeParse(body);
  if (!parsed.success) return { kind: "invalid", files };
  return { kind: "ready", body, files };
}

export interface SourceMediaUploadFormProps {
  readonly bindings: SourceMediaBindings;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
}

export function SourceMediaUploadForm({ bindings, multiple = true, disabled = false }: SourceMediaUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [validation, setValidation] = useState<"empty" | "invalid" | "ready">("empty");
  const [preparationError, setPreparationError] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);

  function selectFiles(next: File[]) {
    setFiles(next);
    setPreparationError(false);
    try {
      setValidation(prepareSourceMediaUpload(next, bindings).kind);
    } catch {
      setValidation("invalid");
      setPreparationError(true);
    }
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Upload media
        </Title>
        <Alert title="Upload unavailable" color="yellow">
          {sourceMediaMutations.upload.reason} Files selected here stay on your device.
        </Alert>
        <FileButton
          multiple={multiple}
          accept={bindings.supportedMediaUploadFormats.join(",")}
          disabled={disabled}
          resetRef={resetRef}
          onChange={(selected) => {
            if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
            selectFiles(Array.isArray(selected) ? selected : [selected]);
            resetRef.current?.();
          }}
        >
          {({ onClick }) => (
            <Button onClick={onClick} disabled={disabled} rightSection={<IconUpload size={16} stroke={1.5} />}>
              Choose images for local preview
            </Button>
          )}
        </FileButton>
        <Text size="sm">PNG, JPEG, WebP, GIF or SVG. Maximum 32 MiB per file.</Text>
        {validation === "invalid" && (
          <Alert color="red" role="alert">
            Choose supported images no larger than 32 MiB each.
          </Alert>
        )}
        {preparationError && <Alert color="red">The selected files could not be prepared. Select them again.</Alert>}
        {files.length > 0 && (
          <Stack component="ul" gap="sm" m={0} p={0} style={{ listStyle: "none" }} aria-label="Selected upload files">
            {files.map((file, index) => (
              <SourceFilePreview key={`${index}:${file.name}:${file.lastModified}`} file={file} bindings={bindings} />
            ))}
          </Stack>
        )}
        <Group>
          <Button disabled>Upload images</Button>
          {files.length > 0 && (
            <Button
              variant="default"
              onClick={() => {
                selectFiles([]);
                resetRef.current?.();
              }}
            >
              Clear selected files
            </Button>
          )}
        </Group>
        <Text component="output" size="sm" aria-live="polite">
          {validation === "ready"
            ? `${files.length} file(s) validated locally. Nothing has been uploaded.`
            : "No upload is running."}
        </Text>
      </Stack>
    </Paper>
  );
}

function SourceFilePreview({ file, bindings }: { readonly file: File; readonly bindings: SourceMediaBindings }) {
  const { mediaUploadSchema } = bindings;
  const [preview, setPreview] = useState<
    | { readonly kind: "ready"; readonly file: File; readonly url: string }
    | { readonly kind: "unavailable"; readonly file: File }
    | null
  >(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  useEffect(() => {
    let url: string | undefined;
    try {
      if (prepareSourceMediaUpload([file], { mediaUploadSchema }).kind !== "ready") {
        setPreview({ kind: "unavailable", file });
        return;
      }
      url = URL.createObjectURL(file);
      setPreview({ kind: "ready", file, url });
    } catch {
      setPreview({ kind: "unavailable", file });
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, mediaUploadSchema]);

  const ready = preview?.kind === "ready" && preview.file === file && failedFile !== file;
  return (
    <Group component="li" align="center" wrap="nowrap">
      {ready ? (
        <Image src={preview.url} alt={file.name} w={64} h={64} fit="contain" onError={() => setFailedFile(file)} />
      ) : (
        <Text size="xs" w={64}>
          Preview unavailable
        </Text>
      )}
      <Stack gap={2} miw={0}>
        <Text size="sm" style={{ overflowWrap: "anywhere" }}>
          {file.name}
        </Text>
        <Text size="xs">{bindings.formatBytes(file.size)}</Text>
      </Stack>
    </Group>
  );
}
