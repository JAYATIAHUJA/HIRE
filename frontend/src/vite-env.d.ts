/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  [key: string]: string | undefined;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
