declare module "@imgly/background-removal" {
  type ImageSource =
    | string
    | URL
    | Blob
    | File
    | ArrayBuffer
    | Uint8Array
    | HTMLImageElement;

  interface Config {
    publicPath?: string;
    debug?: boolean;
    proxyToWorker?: boolean;
    fetchArgs?: RequestInit;
    model?: "medium" | "small";
    output?: {
      format?: "image/png" | "image/jpeg" | "image/webp";
      quality?: number;
      type?: "foreground" | "background" | "mask";
    };
  }

  export function removeBackground(
    source: ImageSource,
    config?: Config,
  ): Promise<Blob>;

  export function preload(config?: Config): Promise<void>;
}
