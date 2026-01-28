export type Provider = "google" | "openai";

export type CliArgs = {
  prompt: string | null;
  promptFiles: string[];
  imagePath: string | null;
  provider: Provider | null;
  model: string | null;
  aspectRatio: string | null;
  size: string | null;
  quality: "normal" | "2k";
  imageSize: "1K" | "2K" | "4K" | null;
  referenceImages: string[];
  n: number;
  json: boolean;
  help: boolean;
};
