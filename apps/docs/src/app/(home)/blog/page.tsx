import { redirect } from "next/navigation";

import { getPostUrl, posts } from "@/lib/source";

export default function BlogIndexPage() {
  const latestPost = posts.entries.toSorted((left, right) => right.date.localeCompare(left.date))[0];

  if (latestPost) redirect(getPostUrl(latestPost));
  return null;
}
