import React from "react";

const reviews = [
  {
    username: "Maeglin",
    profilePicture: "/img/pictures/reviews/maeglin.webp",
    fullText:
      "Day 49/100 set up Homarr just for a test spin. It's a nice dashboard and the Arrs integration especialy the calendar is awesome.",
    link: "https://twitter.com/Maeglin931/status/1555725442744586240",
  },
  {
    username: "Noted",
    profilePicture: "https://noted.lol/content/images/size/w256h256/2023/08/Icon-1.2-1.png",
    fullText: "Homarr - A Simple, Self Hosted and Lightweight Server Homepage",
    link: "https://noted.lol/homarr-a-simple-self-hosted-and-lightweight-server-homepage/",
  },
  {
    username: "IBRACORP",
    profilePicture: "/img/pictures/reviews/ibracorp.webp",
    fullText: "Homarr Is Here To Stay. Here's Why | Selfhosted Homepage",
    link: "https://www.youtube.com/watch?v=Mk9ZZiH5qi0",
  },
  {
    username: "The Geek Freaks",
    profilePicture:
      "https://yt3.ggpht.com/6EWnfiBIE7Bus2MAS6zJsBARQTPWE7B3v7PXdwX1OfohaxylMqdQr-vt4j8gYZTJy2MBiOvu=s500-c-k-c0x00ffffff-no-rj",
    fullText: "MEHR Durchblick mit eigenem Dashboard! (Unraid Homarr Tutorial) ",
    link: "https://www.youtube.com/watch?v=DNGRL5QdBlg",
  },

  {
    username: "u/uncmnsense",
    profilePicture: "/img/pictures/reviews/r_selfhosted.webp",
    fullText: "Anyone using homarr? check it out, its pretty fancy...",
    link: "https://www.reddit.com/r/selfhosted/comments/wqxsk3/anyone_using_homarr_check_it_out_its_pretty_fancy",
  },
  {
    username: "TechHut",
    profilePicture:
      "https://yt3.ggpht.com/TUoF-6QCUIKy6XgFtMG5FWi5FLVhtaUPtTOLvE7Ca3eJif1_RKBci07fKK-QvKxhC0HALEBH7Q=s500-c-k-c0x00ffffff-no-rj",
    fullText: "my FAVORITE Home Server Dashboard - Homarr Setup in Docker",
    link: "https://www.youtube.com/watch?v=A6vcTIzp_Ww",
  },
  {
    username: "u/RoachedCoach",
    profilePicture: "/img/pictures/reviews/r_unraid.webp",
    fullText: "I enjoy Homarr - mostly because it's very simple, straightforward, and attractive.",
    link: "https://www.reddit.com/r/unRAID/comments/wk3x2s/comment/ijn4vpg/",
  },
  {
    username: "Mariushosting",
    link: "https://mariushosting.com/synology-install-homarr-with-portainer/",
    fullText:
      "The thing I like most about Homarr is its speed and simplicity in adding links of your favorite docker apps. You can use it as a bookmark as well. Great integration with Plex, Sonarr, Radarr etc. Homarr supports multiple configs and persistent storage.",
    profilePicture: "https://mariushosting.com/wp-content/uploads/2021/05/cropped-mariushosting512-192x192.png",
  },
  {
    username: "u/YankeesIT",
    profilePicture: "/img/pictures/reviews/r_selfhosted.webp",
    fullText: "My Homarr setup...",
    link: "https://www.reddit.com/r/selfhosted/comments/x84c9v/my_homarr_setup/",
  },
  {
    username: "Selfhosted Corner",
    profilePicture: "https://pbs.twimg.com/profile_banners/1674813613650120705/1691340056/600x200",
    fullText:
      "So you have many different #Selfhosted apps and you are having trouble organizing them? Fear not cause homarr is here is to save you the hassle.",
    link: "https://twitter.com/SlhstdCorner/status/1698674826351685648",
  },
];

export default function HomepageUserReviews() {
  return (
    <div className="my-24">
      <h2 className="lg:text-5xl text-3xl font-extrabold text-center mb-10">Community</h2>
      <p className={"text-xl text-gray-500 dark:text-gray-400 max-w-128 mx-auto mb-3"}>
        We have a big and active community, which regularly contributes new features & integrations to Homarr. Our community translation
        program and modularity end extendability in the code makes it easy to contribute and extend Homarr.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 xl:gap-x-8">
        {reviews.map((review, index) => (
          <article className="bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-2xl">
            <a className="hover:no-underline h-full block p-5" href={review.link} target="_blank" data-umami-event={"Open review"}>
              <div className="flex space-x-4">
                <img className="w-24 h-24 rounded-full dark:bg-zinc-900" src={review.profilePicture} alt="profile" />
                <div className="space-y-1 font-medium dark:text-white">
                  <p className="text--bold m-0">{review.username}</p>

                  <p className="text-gray-600 dark:text-gray-400 text-sm m-0">{review.fullText}</p>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
