export type Platform = "instagram" | "linkedin" | "x" | "facebook";

export interface PlatformDimensions {
  width: number;
  height: number;
  ratio: string;
}

export interface FormatPreset {
  label: string;
  shortLabel: string;
  platforms: Record<Platform, PlatformDimensions>;
}

export type FormatKey =
  | "post_square"
  | "post_vertical"
  | "post_landscape"
  | "story_reel"
  | "ad_square"
  | "ad_vertical"
  | "ad_landscape"
  | "story_ad";

export const FORMAT_PRESETS: Record<FormatKey, FormatPreset> = {
  post_square: {
    label: "Post square (1:1)",
    shortLabel: "Square",
    platforms: {
      instagram: { width: 1080, height: 1080, ratio: "1/1" },
      facebook: { width: 1080, height: 1080, ratio: "1/1" },
      x: { width: 1080, height: 1080, ratio: "1/1" },
      linkedin: { width: 1200, height: 1200, ratio: "1/1" },
    },
  },
  post_vertical: {
    label: "Post vertical (4:5)",
    shortLabel: "Vertical",
    platforms: {
      instagram: { width: 1080, height: 1350, ratio: "4/5" },
      facebook: { width: 1080, height: 1359, ratio: "4/5" },
      x: { width: 720, height: 1280, ratio: "9/16" },
      linkedin: { width: 720, height: 900, ratio: "4/5" },
    },
  },
  post_landscape: {
    label: "Post landscape (16:9)",
    shortLabel: "Landscape",
    platforms: {
      instagram: { width: 1080, height: 566, ratio: "191/100" },
      facebook: { width: 1080, height: 566, ratio: "191/100" },
      x: { width: 1280, height: 720, ratio: "16/9" },
      linkedin: { width: 1200, height: 627, ratio: "191/100" },
    },
  },
  story_reel: {
    label: "Story / Reel (9:16)",
    shortLabel: "Story",
    platforms: {
      instagram: { width: 1080, height: 1920, ratio: "9/16" },
      facebook: { width: 1080, height: 1920, ratio: "9/16" },
      x: { width: 720, height: 1280, ratio: "9/16" },
      linkedin: { width: 1080, height: 1920, ratio: "9/16" },
    },
  },
  ad_square: {
    label: "Ad square (1:1)",
    shortLabel: "Ad square",
    platforms: {
      instagram: { width: 1440, height: 1440, ratio: "1/1" },
      facebook: { width: 1440, height: 1440, ratio: "1/1" },
      x: { width: 800, height: 800, ratio: "1/1" },
      linkedin: { width: 1200, height: 1200, ratio: "1/1" },
    },
  },
  ad_vertical: {
    label: "Ad vertical (4:5)",
    shortLabel: "Ad vertical",
    platforms: {
      instagram: { width: 1080, height: 1350, ratio: "4/5" },
      facebook: { width: 1440, height: 1800, ratio: "4/5" },
      x: { width: 800, height: 800, ratio: "1/1" },
      linkedin: { width: 720, height: 900, ratio: "4/5" },
    },
  },
  ad_landscape: {
    label: "Ad landscape (1.91:1)",
    shortLabel: "Ad landscape",
    platforms: {
      instagram: { width: 1080, height: 566, ratio: "191/100" },
      facebook: { width: 1080, height: 566, ratio: "191/100" },
      x: { width: 800, height: 418, ratio: "191/100" },
      linkedin: { width: 1200, height: 628, ratio: "191/100" },
    },
  },
  story_ad: {
    label: "Story / Reel ad (9:16)",
    shortLabel: "Story ad",
    platforms: {
      instagram: { width: 1440, height: 2560, ratio: "9/16" },
      facebook: { width: 1440, height: 2560, ratio: "9/16" },
      x: { width: 720, height: 1280, ratio: "9/16" },
      linkedin: { width: 1080, height: 1920, ratio: "9/16" },
    },
  },
} as const;

export const FORMAT_KEYS = Object.keys(FORMAT_PRESETS) as FormatKey[];
