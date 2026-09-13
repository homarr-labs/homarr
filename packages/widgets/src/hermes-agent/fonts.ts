import {
  Atkinson_Hyperlegible,
  DM_Mono,
  DM_Sans,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Share_Tech_Mono,
  Source_Serif_4,
  Space_Mono,
  Spectral,
  Work_Sans,
} from "next/font/google";

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hermes-atkinson-hyperlegible",
  display: "swap",
  preload: false,
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-hermes-dm-mono",
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-hermes-dm-sans",
  display: "swap",
  preload: false,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-hermes-fraunces",
  display: "swap",
  preload: false,
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-hermes-ibm-plex-mono",
  display: "swap",
  preload: false,
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-hermes-ibm-plex-sans",
  display: "swap",
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-hermes-jetbrains-mono",
  display: "swap",
  preload: false,
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hermes-share-tech-mono",
  display: "swap",
  preload: false,
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-hermes-source-serif-4",
  display: "swap",
  preload: false,
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hermes-space-mono",
  display: "swap",
  preload: false,
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hermes-spectral",
  display: "swap",
  preload: false,
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-hermes-work-sans",
  display: "swap",
  preload: false,
});

export const hermesFontVariables = [
  atkinsonHyperlegible.variable,
  dmMono.variable,
  dmSans.variable,
  fraunces.variable,
  ibmPlexMono.variable,
  ibmPlexSans.variable,
  jetBrainsMono.variable,
  shareTechMono.variable,
  sourceSerif.variable,
  spaceMono.variable,
  spectral.variable,
  workSans.variable,
].join(" ");
