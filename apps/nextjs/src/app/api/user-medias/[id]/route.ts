import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db, eq } from "@homarr/db";
import { medias } from "@homarr/db/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const image = await db.query.medias.findFirst({
    where: eq(medias.id, params.id),
    columns: {
      content: true,
      contentType: true,
    },
  });

  if (!image) {
    notFound();
  }

  const headers = new Headers();
  headers.set("Content-Type", image.contentType);
  headers.set("Content-Length", image.content.length.toString());

  return new NextResponse(image.content, {
    status: 200,
    headers,
  });
}
