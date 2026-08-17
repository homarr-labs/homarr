interface MediaContainer {
  Video?: Session[];
  Track?: Session[];
}

interface Stream {
  $: {
    streamType: string;
    codec?: string;
    language?: string;
    selected?: string;
    width?: string;
    height?: string;
    frameRate?: string;
    channels?: string;
  };
}

interface Part {
  Stream?: Stream[];
  $: {
    container?: string;
  };
}

interface Media {
  Part?: Part[];
  $: {
    videoResolution?: string;
    videoCodec?: string;
    audioCodec?: string;
    bitrate?: string;
    container?: string;
  };
}

interface TranscodeSession {
  $: {
    throttled?: string;
    progress?: string;
    speed?: string;
    videoDecision?: string;
    audioDecision?: string;
    sourceVideoCodec?: string;
    sourceAudioCodec?: string;
    videoCodec?: string;
    audioCodec?: string;
    container?: string;
    width?: string;
    height?: string;
  };
}

interface Session {
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
      address?: string;
      state?: string;
      local?: string;
    };
  }[];
  Session?: {
    $: {
      id: string;
      bandwidth?: string;
      location?: string;
    };
  }[];
  TranscodeSession?: TranscodeSession[];
  Media?: Media[];
  $: {
    grandparentTitle?: string;
    parentTitle?: string;
    parentIndex?: number;
    title?: string;
    index?: number;
    type: string;
    live?: string;
    viewOffset?: string;
    duration?: string;
  };
}

export interface PlexResponse {
  MediaContainer: MediaContainer;
}
