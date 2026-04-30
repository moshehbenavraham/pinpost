import {
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ThumbsUp,
  Send,
  Repeat,
  FileVideo,
} from "lucide-react";
import { FORMAT_PRESETS, type FormatKey } from "./formatPresets";

type Platform = "instagram" | "linkedin" | "x" | "facebook";

interface MediaFile {
  id: string;
  url: string;
  type: "image" | "video";
}

const platformMeta = {
  instagram: { icon: Instagram, name: "Instagram", color: "text-pink-500" },
  linkedin: { icon: Linkedin, name: "LinkedIn", color: "text-blue-700" },
  x: { icon: Twitter, name: "X", color: "text-foreground" },
  facebook: { icon: Facebook, name: "Facebook", color: "text-blue-600" },
};

interface PlatformPreviewProps {
  platform: Platform;
  text: string;
  media?: MediaFile[];
  formatKey?: FormatKey;
  displayName?: string;
  handle?: string;
  profileImageUrl?: string;
}

export function PlatformPreview({ platform, text, media = [], formatKey = "post_square", displayName, handle, profileImageUrl }: PlatformPreviewProps) {
  const meta = platformMeta[platform];
  const Icon = meta.icon;
  const displayText = text || "Your post preview will appear here…";
  const preset = FORMAT_PRESETS[formatKey];
  const dims = preset.platforms[platform];

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Platform header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-white">
        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        <span className="text-xs font-medium text-foreground">{meta.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">
          {dims.width}×{dims.height}
        </span>
      </div>

      {/* Post content */}
      <div className="p-4">
        {/* User info */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-primary">
                {displayName?.[0]?.toUpperCase() || "Y"}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">
              {displayName || "Your name"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platform === "instagram"
                ? handle || "your_handle"
                : platform === "x"
                  ? `@${handle || "you"} · now`
                  : platform === "linkedin"
                    ? `${displayName || "Your title"} · Just now`
                    : "Just now · 🌐"}
            </p>
          </div>
        </div>

        {/* Post text */}
        {text ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
            {platform === "instagram" && text.length > 125
              ? text.slice(0, 125) + "… more"
              : text}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground italic">{displayText}</p>
        )}

        {/* Media preview with format-specific aspect ratio */}
        {media.length > 0 && (
          <div className="mt-3 space-y-0.5">
            {media.length === 1 ? (
              <div className="relative overflow-hidden rounded-lg border border-border bg-muted" style={{ aspectRatio: dims.ratio.replace("/", " / ") }}>
                {media[0].type === "image" ? (
                  <img src={media[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={media[0].url} className="h-full w-full object-cover" controls playsInline />
                )}
                <div className="absolute bottom-1.5 right-1.5 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-mono text-background tabular-nums">
                  {preset.shortLabel}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg border border-border">
                {media.slice(0, 4).map((m, i) => (
                  <div
                    key={m.id}
                    className={`relative bg-muted ${
                      media.length === 3 && i === 0 ? "row-span-2" : ""
                    }`}
                    style={{ aspectRatio: media.length === 3 && i === 0 ? dims.ratio.replace("/", " / ") : "1 / 1" }}
                  >
                    {m.type === "image" ? (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={m.url} className="h-full w-full object-cover" controls playsInline />
                    )}
                    {media.length > 4 && i === 3 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                        <span className="text-lg font-semibold text-background">+{media.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform-specific engagement bar */}
        <div className="mt-4 pt-3 border-t border-border">
          {platform === "instagram" && (
            <div className="flex items-center gap-4">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Send className="h-4 w-4 text-muted-foreground" />
              <Bookmark className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          )}
          {platform === "linkedin" && (
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
              <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> Repost</span>
              <span className="flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Send</span>
            </div>
          )}
          {platform === "x" && (
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> 0</span>
              <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> 0</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> 0</span>
              <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /></span>
            </div>
          )}
          {platform === "facebook" && (
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
              <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> Share</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
