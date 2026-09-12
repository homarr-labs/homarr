import { redirect } from "next/navigation";
import { Container } from "@mantine/core";
import { auth } from "@homarr/auth/next";
import { PackageSessionPreview } from "../../_package-session-preview";

export default async function PackagePreviewPage({ params }: { params: Promise<{ previewId: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/manage/custom-widgets");
  const { previewId } = await params;
  return (
    <Container fluid>
      <PackageSessionPreview previewId={previewId} />
    </Container>
  );
}
