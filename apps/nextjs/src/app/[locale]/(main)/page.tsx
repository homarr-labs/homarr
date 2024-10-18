import Image from "next/image";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";

import { MediaForm } from "./_form";

export default async function HomePage() {
  const medias = await api.media.getMedias({ all: true });

  return (
    <Stack>
      <Title>Home</Title>

      <MediaForm />

      <Stack>
        {medias.map((media) => (
          <div key={media.id}>
            <Image
              style={{ objectFit: "contain" }}
              width={128}
              height={128}
              src={`/api/user-medias/${media.id}`}
              alt={media.name}
            />
            <p>{media.name}</p>
          </div>
        ))}
      </Stack>
    </Stack>
  );
}
