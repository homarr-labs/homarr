import { IconDownload } from "@homarr/ui";

import { useRegisterSpotlightActions } from "./data-store";

export const useWebSearchEngines = () => {
  useRegisterSpotlightActions("web-search-engines", [
    {
      id: "google",
      title: "Google",
      description: "Search the web with Google",
      icon: "https://www.google.com/favicon.ico",
      href: "https://www.google.com/search?q=%s",
      group: "web",
      type: "link",
      ignoreSearchAndOnlyShowInGroup: true,
      openInNewTab: true,
    },
    {
      id: "bing",
      title: "Bing",
      description: "Search the web with Bing",
      icon: "https://www.bing.com/favicon.ico",
      href: "https://www.bing.com/search?q=%s",
      group: "web",
      type: "link",
      ignoreSearchAndOnlyShowInGroup: true,
      openInNewTab: true,
    },
    {
      id: "duckduckgo",
      title: "DuckDuckGo",
      description: "Search the web with DuckDuckGo",
      icon: "https://duckduckgo.com/favicon.ico",
      href: "https://duckduckgo.com/?q=%s",
      group: "web",
      type: "link",
      ignoreSearchAndOnlyShowInGroup: true,
      openInNewTab: true,
    },
    {
      id: "torrent",
      title: "Torrents",
      description: "Search for torrents on torrentdownloads.pro",
      icon: IconDownload,
      href: "https://www.torrentdownloads.pro/search/?search=%s",
      group: "web",
      type: "link",
      ignoreSearchAndOnlyShowInGroup: true,
      openInNewTab: true,
    },
    {
      id: "youtube",
      title: "YouTube",
      description: "Search for videos on YouTube",
      icon: "https://www.youtube.com/favicon.ico",
      href: "https://www.youtube.com/results?search_query=%s",
      group: "web",
      type: "link",
      ignoreSearchAndOnlyShowInGroup: true,
      openInNewTab: true,
    },
  ]);
};
