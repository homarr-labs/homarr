import { useRegisterSpotlightActions } from "./data-store";
import type { SpotlightActionData } from "./type";

const webActions = [
  {
    id: "1",
    title: "Google",
    description: "Search the web using Google",
    group: "web",
    icon: "https://www.google.com/favicon.ico",
    type: "link",
    href: "https://www.google.com/search?q=%s",
    ignoreSearchAndOnlyShowInGroup: true,
  },
  {
    id: "2",
    title: "DuckDuckGo",
    description: "Search the web using DuckDuckGo",
    group: "web",
    icon: "https://duckduckgo.com/assets/icons/meta/DDG-iOS-icon_152x152.png",
    type: "link",
    href: "https://duckduckgo.com",
    ignoreSearchAndOnlyShowInGroup: true,
  },
  {
    id: "3",
    title: "Bing",
    description: "Search the web using Bing",
    group: "web",
    icon: "https://www.bing.com/sa/simg/favicon-2x.ico",
    type: "link",
    href: "https://www.bing.com",
    ignoreSearchAndOnlyShowInGroup: true,
  },
  {
    id: "4",
    title: "Yahoo",
    description: "Search the web using Yahoo",
    group: "web",
    icon: "https://www.yahoo.com/favicon.ico",
    type: "link",
    href: "https://www.yahoo.com",
    ignoreSearchAndOnlyShowInGroup: true,
  },
] satisfies SpotlightActionData[];

export const useRegisterWebActions = () => {
  useRegisterSpotlightActions("common-web-actions", webActions);
};
