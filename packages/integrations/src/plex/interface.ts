interface MediaContainer {
  Video?: {
    User?: {
      $: {
        id: string;
        title: string;
        thumb?: string;
      };
    }[];
    Player?: {
      $: {
        product: string;
        title: string;
      };
    }[];
    Media?: {
      $: {
        videoCodec: string;
        videoFrameRate: string;
        audioCodec: string;
        audioChannels: number;
        width: number;
        height: number;
        bitrate: number;
      };
    }[];
    Session?: {
      $: {
        id: string;
      };
    }[];
    TranscodeSession?: {
      $: {
        videoCodec: string;
        audioCodec: string;
        width: number;
        height: number;
      };
    }[];
    $: {
      grandparentTitle?: string;
      parentTitle?: string;
      title?: string;
      index?: number;
      type: string;
    };
  }[];
}

export interface PlexResponse {
  MediaContainer: MediaContainer;
}
