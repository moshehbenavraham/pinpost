import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, LogOut, FileText, Clock, Sparkles, Image as ImageIcon, PenLine, Eye, Video } from "lucide-react";
import logoPinpost from "@/assets/logo-pinpost.png";
import { Button } from "@/components/ui/button";
import { FORMAT_PRESETS, type FormatKey } from "@/components/editor/formatPresets";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Draft {
  id: string;
  title: string;
  text: string;
  format_key: string;
  updated_at: string;
}

interface DraftThumbnail {
  draftId: string;
  url: string;
  type: "image" | "video";
}

interface Profile {
  display_name: string;
  handle: string;
  avatar_url: string;
}

function VideoStill({ src, className }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = src;

    const handleSeek = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCaptured(true);
      }
      video.remove();
    };

    video.addEventListener("seeked", handleSeek, { once: true });
    video.addEventListener("loadeddata", () => {
      video.currentTime = 0.5;
    }, { once: true });

    return () => {
      video.removeEventListener("seeked", handleSeek);
      video.remove();
    };
  }, [src]);

  return (
    <div className={`relative ${className || ""}`}>
      <canvas ref={canvasRef} className={`h-full w-full object-cover ${captured ? "" : "opacity-0"}`} />
      {!captured && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-mono text-background">
        Video
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ display_name: "", handle: "", avatar_url: "" });
  const [avatarPath, setAvatarPath] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [thumbnails, setThumbnails] = useState<DraftThumbnail[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate, redirecting]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        const [profileRes, draftsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("drafts").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
        ]);

        if (!mounted) return;

        if (profileRes.data) {
          const rawPath = profileRes.data.avatar_url || "";
          setAvatarPath(rawPath);
          let avatarUrl = rawPath;
          if (avatarUrl && !avatarUrl.startsWith("http")) {
            const { data: signedData } = await supabase.storage
              .from("avatars")
              .createSignedUrl(avatarUrl, 3600);
            avatarUrl = signedData?.signedUrl || "";
          }
          setProfile({
            display_name: profileRes.data.display_name || "",
            handle: profileRes.data.handle || "",
            avatar_url: avatarUrl,
          });
        }

        if (draftsRes.data) {
          const typedDrafts = draftsRes.data as Draft[];
          setDrafts(typedDrafts);

          // Load first thumbnail for each draft (images first, then video still)
          const thumbs: DraftThumbnail[] = [];
          for (const d of typedDrafts) {
            // Try image first
            const { data: imageData } = await supabase
              .from("draft_media")
              .select("storage_path, file_type")
              .eq("draft_id", d.id)
              .eq("file_type", "image")
              .eq("uploaded", true)
              .order("sort_order", { ascending: true })
              .limit(1);

            if (!mounted) return;

            if (imageData && imageData.length > 0) {
              const { data: signedData } = await supabase.storage
                .from("draft-media")
                .createSignedUrl(imageData[0].storage_path, 3600);
              if (signedData?.signedUrl) {
                thumbs.push({ draftId: d.id, url: signedData.signedUrl, type: "image" });
                continue;
              }
            }

            // Fallback: try video and capture a still frame
            const { data: videoData } = await supabase
              .from("draft_media")
              .select("storage_path, file_type")
              .eq("draft_id", d.id)
              .eq("file_type", "video")
              .eq("uploaded", true)
              .order("sort_order", { ascending: true })
              .limit(1);

            if (!mounted) return;

            if (videoData && videoData.length > 0) {
              const { data: signedData } = await supabase.storage
                .from("draft-media")
                .createSignedUrl(videoData[0].storage_path, 3600);
              if (signedData?.signedUrl) {
                thumbs.push({ draftId: d.id, url: signedData.signedUrl, type: "video" });
              }
            }
          }
          if (mounted) setThumbnails(thumbs);
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  const saveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name: profile.display_name,
        handle: profile.handle,
        avatar_url: avatarPath,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setSaving(false);
    }
  }, [user, profile, avatarPath]);

  const getSignedAvatarUrl = useCallback(async (path: string): Promise<string> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }, []);

  const handleAvatarUpload = useCallback(async (files: FileList | null) => {
    if (!files?.[0] || !user) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      const storagePath = path;
      const signedUrl = await getSignedAvatarUrl(storagePath);
      setAvatarPath(storagePath);
      setProfile((p) => ({ ...p, avatar_url: signedUrl }));

      await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: storagePath,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to upload avatar", e);
    }
  }, [user, getSignedAvatarUrl]);

  const deleteDraft = useCallback(async (id: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("drafts").delete().eq("id", id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setThumbnails((prev) => prev.filter((t) => t.draftId !== id));
    } catch (e) {
      console.error("Failed to delete draft", e);
    }
  }, []);

  if (loading || redirecting || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const firstName = profile.display_name?.split(" ")[0] || "there";
  const getThumbnail = (draftId: string) => thumbnails.find((t) => t.draftId === draftId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-white px-6">
        <div className="flex items-center gap-2.5">
          <img src={logoPinpost} alt="PinPost" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {/* Welcome banner */}
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
            Create, preview, and enhance your social media posts across Instagram, LinkedIn, X, and Facebook — all in one place.
          </p>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/editor"
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">New post</p>
              <p className="text-xs text-muted-foreground">Start composing</p>
            </div>
          </Link>
          <button
            onClick={() => {
              const el = document.getElementById("profile-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98] text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Edit profile</p>
              <p className="text-xs text-muted-foreground">Name, handle, avatar</p>
            </div>
          </button>
          <Link
            to="/editor"
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI enhance</p>
              <p className="text-xs text-muted-foreground">Optimize your copy</p>
            </div>
          </Link>
        </section>

        {/* Drafts section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your drafts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {drafts.length === 0 ? "No saved drafts yet" : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} saved`}
              </p>
            </div>
            <Button size="sm" className="gap-1.5" asChild>
              <Link to="/editor">
                <Plus className="h-3.5 w-3.5" />
                New post
              </Link>
            </Button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No drafts yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Create your first post to see how it looks across all platforms before publishing.
              </p>
              <Button size="sm" variant="outline" className="mt-4 gap-1.5 bg-white" asChild>
                <Link to="/editor">
                  <Plus className="h-3.5 w-3.5" />
                  Create your first post
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drafts.map((draft) => {
                const format = FORMAT_PRESETS[draft.format_key as FormatKey];
                const thumb = getThumbnail(draft.id);
                return (
                  <Link
                    key={draft.id}
                    to="/editor"
                    search={{ draft: draft.id }}
                    className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-36 w-full bg-muted overflow-hidden shrink-0">
                      {thumb ? (
                        thumb.type === "video" ? (
                          <VideoStill src={thumb.url} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <img
                            src={thumb.url}
                            alt="Draft preview"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {format && (
                        <span className="absolute top-2 left-2 text-[10px] font-medium text-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-md">
                          {format.shortLabel}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between p-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {draft.title || "Untitled draft"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {draft.text?.slice(0, 120) || "Empty draft"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(draft.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDraft(draft.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Profile card */}
        <section id="profile-section" className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-base font-semibold text-foreground">Profile settings</h2>
            <span className="text-xs text-muted-foreground">· Shown in previews</span>
          </div>
          <div className="flex items-start gap-5">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleAvatarUpload(e.target.files); e.target.value = ""; }}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="h-20 w-20 shrink-0 rounded-full border border-border bg-muted/40 flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
              title="Upload profile image"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover rounded-full" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
              )}
            </button>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display name</label>
                <input
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <input
                    value={profile.handle}
                    onChange={(e) => setProfile((p) => ({ ...p, handle: e.target.value.replace(/^@/, "") }))}
                    placeholder="handle"
                    className="w-full rounded-lg border border-input bg-transparent pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
              </div>
              <Button size="sm" onClick={saveProfile} disabled={saving} className="mt-1">
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
