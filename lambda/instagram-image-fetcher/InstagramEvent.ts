export interface InstagramEvent {
  caption: string;
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  username: string;
}

export interface ImageEvent extends InstagramEvent {
  image: Buffer;
}

export interface ResizeEvent extends ImageEvent {
  resizedImage: Buffer;
}
