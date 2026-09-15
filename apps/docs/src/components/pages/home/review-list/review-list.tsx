import { IconArrowUpRight, IconBrandDiscord } from "@tabler/icons-react";

const reviews = [
  {
    username: "Maeglin",
    profilePicture: "/img/pictures/reviews/maeglin.webp",
    fullText:
      "Day 49/100 set up Homarr just for a test spin. It's a nice dashboard and the Arrs integration especialy the calendar is awesome.",
    link: "https://twitter.com/Maeglin931/status/1555725442744586240",
    source: "Community setup",
  },
  {
    username: "IBRACORP",
    profilePicture: "/img/pictures/reviews/ibracorp.webp",
    fullText: "Homarr Is Here To Stay. Here's Why | Selfhosted Homepage",
    link: "https://www.youtube.com/watch?v=Mk9ZZiH5qi0",
    source: "Video review",
  },
  {
    username: "u/uncmnsense",
    profilePicture: "/img/pictures/reviews/r_selfhosted.webp",
    fullText: "Anyone using homarr? check it out, its pretty fancy...",
    link: "https://www.reddit.com/r/selfhosted/comments/wqxsk3/anyone_using_homarr_check_it_out_its_pretty_fancy",
    source: "r/selfhosted",
  },
  {
    username: "u/RoachedCoach",
    profilePicture: "/img/pictures/reviews/r_unraid.webp",
    fullText: "I enjoy Homarr - mostly because it's very simple, straightforward, and attractive.",
    link: "https://www.reddit.com/r/unRAID/comments/wk3x2s/comment/ijn4vpg/",
    source: "r/unRAID",
  },
] as const;

export default function HomepageUserReviews() {
  return (
    <section className="my-20 sm:my-24" aria-labelledby="community-title">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="community-title" className="m-0 text-3xl font-bold tracking-tight sm:text-5xl">
          Community
        </h2>
        <p className="mb-0 mt-5 text-base leading-7 text-fd-muted-foreground sm:text-lg">
          Get help, report issues, and contribute through the Homarr community.
        </p>
        <a
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-fd-primary hover:underline"
          href="https://discord.com/invite/aCsmEV5RgA"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconBrandDiscord aria-hidden="true" size={19} />
          Join Discord
        </a>
      </div>

      <div className="mt-10 grid grid-cols-1 border sm:grid-cols-2">
        {reviews.map((review, index) => (
          <a
            key={review.link}
            aria-label={`Read ${review.username} on ${review.source}`}
            className={`group block p-6 text-fd-foreground transition-colors hover:bg-fd-muted/60 sm:p-8 ${
              index > 0 ? "border-t sm:border-t-0" : ""
            } ${index % 2 === 1 ? "sm:border-l" : ""} ${index >= 2 ? "sm:border-t" : ""}`}
            href={review.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <blockquote className="m-0">
              <p className="m-0 text-base leading-7">“{review.fullText}”</p>
              <footer className="mt-6 flex items-center gap-3">
                <img
                  className="size-11 rounded-full bg-fd-muted object-cover"
                  src={review.profilePicture}
                  alt=""
                  width={44}
                  height={44}
                />
                <span className="min-w-0 flex-1">
                  <cite className="block not-italic text-sm font-semibold">{review.username}</cite>
                  <span className="block text-xs text-fd-muted-foreground">{review.source}</span>
                </span>
                <IconArrowUpRight
                  aria-hidden="true"
                  className="text-fd-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fd-primary"
                  size={18}
                />
              </footer>
            </blockquote>
          </a>
        ))}
      </div>
    </section>
  );
}
