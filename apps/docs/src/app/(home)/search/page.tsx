import { SearchPage } from "@/components/search-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Search documentation",
    description: "Search Homarr documentation, API reference, and project news.",
    path: "/search",
  }),
  robots: { index: false, follow: true },
};

export default function Page() {
  return <SearchPage />;
}
