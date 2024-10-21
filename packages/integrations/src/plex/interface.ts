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
    Session?: {
      $: {
        id: string;
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
