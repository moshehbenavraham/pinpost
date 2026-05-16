import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Video, LogOut, X as XIcon, FileImage, FileVideo, ChevronDown, AlertCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import logoPinpost from "@/assets/logo-pinpost.png";
import { Button } from "@/components/ui/button";
import { PlatformPreview } from "./PlatformPreview";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FORMAT_PRESETS, FORMAT_KEYS, type FormatKey } from "./formatPresets";
import { EnhanceButton } from "./EnhanceButton";
import { getRouteApi } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";


const editorRoute = getRouteApi("/editor");

const PLATFORM_LIMITS = {
  instagram: 2200,
  linkedin: 3000,
  x: 280,
  facebook: 63206,
} as const;

type Platform = keyof typeof PLATFORM_LIMITS;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

interface MediaFile {
  id: string;
  file: File;
  url: string;
  previewUrl: string;
  type: "image" | "video";
  /** Whether this file has been uploaded to storage already */
  uploaded: boolean;
  /** The storage path for this file */
  storagePath?: string;
  /** DB record id for diffing */
  dbRecordId?: string;
}

/** Upload a file to Supabase storage via XHR for progress tracking */
async function uploadFileWithProgress(
  file: File,
  storagePath: string,
  token: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/storage/v1/object/draft-media/${storagePath}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type);

    console.log("[Upload] Starting XHR upload:", storagePath, "size:", file.size, "type:", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log("[Upload] Success:", storagePath);
        onProgress(100);
        resolve();
      } else {
        console.error("[Upload] Failed:", xhr.status, xhr.responseText);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => { console.error("[Upload] Network error"); reject(new Error("Network error during upload")); };
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.timeout = 0; // No timeout — let large files upload fully

    xhr.send(file);
  });
}

export function PostEditor() {
  const [text, setText] = useState("");
  const [activePlatform, setActivePlatform] = useState<Platform | "all">("all");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<FormatKey>("post_square");
  const [formatOpen, setFormatOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const uploadingIdsRef = useRef<Set<string>>(new Set());
  const draftIdRef = useRef<string | null>(null);

  const { draft } = editorRoute.useSearch();

  // Keep draftIdRef in sync
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  // Ensure a draft exists (create one if needed) and return the draftId
  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (draftId) return draftId;
    if (!user) return null;

    const { supabase } = await import("@/integrations/supabase/client");
    const title = text.slice(0, 60).trim() || "Untitled draft";

    const { data } = await supabase.from("drafts").insert({
      user_id: user.id,
      title,
      text,
      format_key: selectedFormat,
    }).select("id").single();

    if (data) {
      setDraftId(data.id);
      return data.id;
    }
    return null;
  }, [draftId, user, text, selectedFormat]);

  // Load profile and draft on mount
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!mounted) return;
        if (profileData) {
          setDisplayName(profileData.display_name || "");
          setHandle(profileData.handle || "");
          let avatarUrl = profileData.avatar_url || "";
          if (avatarUrl && !avatarUrl.startsWith("http")) {
            const { data: signedData } = await supabase.storage
              .from("avatars")
              .createSignedUrl(avatarUrl, 3600);
            avatarUrl = signedData?.signedUrl || "";
          }
          setProfileImageUrl(avatarUrl);
        }

        // Load draft if param present
        if (draft) {
          const { data: draftData } = await supabase
            .from("drafts")
            .select("*")
            .eq("id", draft)
            .eq("user_id", user.id)
            .single();

          if (!mounted) return;
          if (draftData) {
            setDraftId(draftData.id);
            setText(draftData.text || "");
            setSelectedFormat((draftData.format_key as FormatKey) || "post_square");

            // Load media files for this draft
            const { data: mediaData } = await supabase
              .from("draft_media")
              .select("*")
              .eq("draft_id", draftData.id)
              .order("sort_order", { ascending: true });

            if (!mounted) return;
            if (mediaData && mediaData.length > 0) {
              const loadedMedia: MediaFile[] = [];
              for (const m of mediaData) {
                const isUploaded = m.uploaded !== false;

                if (!isUploaded) {
                  // File not uploaded — show placeholder with retry
                  loadedMedia.push({
                    id: m.storage_path.split("/").pop() || crypto.randomUUID(),
                    file: new File([], m.file_name || "file"),
                    url: "",
                    previewUrl: "",
                    type: m.file_type === "video" ? "video" : "image",
                    uploaded: false,
                    storagePath: m.storage_path,
                    dbRecordId: m.id,
                  });
                  continue;
                }

                const { data: signedData } = await supabase.storage
                  .from("draft-media")
                  .createSignedUrl(m.storage_path, 3600);
                if (signedData?.signedUrl) {
                  loadedMedia.push({
                    id: m.storage_path.split("/").pop() || crypto.randomUUID(),
                    file: new File([], m.file_name || "file", { type: m.file_type === "video" ? "video/mp4" : "image/jpeg" }),
                    url: signedData.signedUrl,
                    previewUrl: signedData.signedUrl,
                    type: m.file_type === "video" ? "video" : "image",
                    uploaded: true,
                    storagePath: m.storage_path,
                    dbRecordId: m.id,
                  });
                }
              }
              if (!mounted) return;
              setMediaFiles(loadedMedia);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load editor data", e);
      }
    })();

    return () => { mounted = false; };
  }, [user, draft]);

  // Upload a single file immediately to storage — DB row created ONLY after success
  const uploadFileImmediately = useCallback(async (media: MediaFile) => {
    if (!user) return;
    if (uploadingIdsRef.current.has(media.id)) return;
    uploadingIdsRef.current.add(media.id);

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Ensure we have a draft to attach this media to
      let currentDraftId = draftIdRef.current;
      if (!currentDraftId) {
        const { data } = await supabase.from("drafts").insert({
          user_id: user.id,
          title: text.slice(0, 60).trim() || "Untitled draft",
          text,
          format_key: selectedFormat,
        }).select("id").single();
        if (data) {
          currentDraftId = data.id;
          setDraftId(data.id);
          draftIdRef.current = data.id;
        } else {
          throw new Error("Failed to create draft");
        }
      }

      const storagePath = `${user.id}/${currentDraftId}/${media.id}`;

      // Get auth token for XHR
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No auth token");

      // Upload with real progress — NO DB row yet
      setUploadProgress(prev => ({ ...prev, [media.id]: 0 }));
      setUploadErrors(prev => { const n = { ...prev }; delete n[media.id]; return n; });

      console.log("[Upload] Starting upload for", media.file.name, "size:", media.file.size);

      await uploadFileWithProgress(
        media.file,
        storagePath,
        token,
        (pct) => setUploadProgress(prev => ({ ...prev, [media.id]: pct })),
      );

      console.log("[Upload] Storage upload complete, inserting DB row");

      // Only NOW insert the draft_media row — file is confirmed in storage
      const { error: dbError } = await supabase.from("draft_media").insert({
        draft_id: currentDraftId,
        user_id: user.id,
        storage_path: storagePath,
        file_type: media.type,
        file_name: media.file.name || "file",
        sort_order: 0,
        uploaded: true,
      });

      if (dbError) {
        console.error("[Upload] DB insert failed:", dbError);
        throw new Error("Failed to save media record: " + dbError.message);
      }

      console.log("[Upload] DB row inserted successfully for", storagePath);

      // Update local state
      setMediaFiles(prev => prev.map(m =>
        m.id === media.id ? { ...m, uploaded: true, storagePath } : m
      ));

      // Clean up progress after a moment
      setTimeout(() => {
        setUploadProgress(prev => { const n = { ...prev }; delete n[media.id]; return n; });
      }, 1500);

    } catch (err: unknown) {
      console.error("[Upload] Failed for", media.file.name, err);
      setUploadErrors(prev => ({ ...prev, [media.id]: getErrorMessage(err, "Upload failed") }));
      setUploadProgress(prev => { const n = { ...prev }; delete n[media.id]; return n; });
    } finally {
      uploadingIdsRef.current.delete(media.id);
    }
  }, [user, text, selectedFormat]);

  // Save draft — just DB writes, files already uploaded
  const saveDraft = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const title = text.slice(0, 60).trim() || "Untitled draft";

      let currentDraftId = draftId;

      if (currentDraftId) {
        await supabase.from("drafts").update({
          title,
          text,
          format_key: selectedFormat,
          updated_at: new Date().toISOString(),
        }).eq("id", currentDraftId);
      } else {
        const { data } = await supabase.from("drafts").insert({
          user_id: user.id,
          title,
          text,
          format_key: selectedFormat,
        }).select("id").single();

        if (data) {
          currentDraftId = data.id;
          setDraftId(data.id);
        }
      }

      if (currentDraftId) {
        // Get existing media records for diffing
        const { data: existingMedia } = await supabase
          .from("draft_media")
          .select("id, storage_path, uploaded")
          .eq("draft_id", currentDraftId);

        const existingPaths = new Set((existingMedia || []).map(m => m.storage_path));
        const currentIds = new Set(mediaFiles.map(m => m.id));

        // Delete removed media records
        const toDelete = (existingMedia || []).filter(m => {
          const mediaId = m.storage_path.split("/").pop();
          return !currentIds.has(mediaId || "");
        });
        for (const d of toDelete) {
          await supabase.from("draft_media").delete().eq("id", d.id);
          if (d.uploaded) {
            await supabase.storage.from("draft-media").remove([d.storage_path]);
          }
        }

        // Update sort orders for existing items
        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          const storagePath = `${user.id}/${currentDraftId}/${media.id}`;
          if (existingPaths.has(storagePath)) {
            await supabase.from("draft_media")
              .update({ sort_order: i })
              .eq("draft_id", currentDraftId)
              .eq("storage_path", storagePath);
          }
        }
      }
      toast.success("Draft saved.");
    } catch (e) {
      console.error("Failed to save draft", e);
      toast.error("Couldn't save your draft. Try again.");
    } finally {
      setSaving(false);
    }
  }, [user, draftId, text, selectedFormat, mediaFiles]);

  const handleProfileImage = useCallback((files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    if (profileImageUrl) URL.revokeObjectURL(profileImageUrl);
    setProfileImageUrl(URL.createObjectURL(file));
  }, [profileImageUrl]);

  const platforms: Platform[] = ["instagram", "linkedin", "x", "facebook"];

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newMedia: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;

      const blobUrl = URL.createObjectURL(file);
      const mediaItem: MediaFile = {
        id: crypto.randomUUID(),
        file,
        url: blobUrl,
        previewUrl: blobUrl,
        type: isVideo ? "video" : "image",
        uploaded: false,
      };
      newMedia.push(mediaItem);
    }

    if (newMedia.length > 0) {
      setMediaFiles((prev) => [...prev, ...newMedia]);
      // Start uploading each file immediately
      for (const media of newMedia) {
        uploadFileImmediately(media);
      }
    }
  }, [uploadFileImmediately]);

  const removeMedia = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const removed = prev.find((m) => m.id === id);
      if (removed && removed.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      return prev.filter((m) => m.id !== id);
    });
    setUploadProgress(prev => { const n = { ...prev }; delete n[id]; return n; });
    setUploadErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const hasActiveUploads = Object.keys(uploadProgress).length > 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <img src={logoPinpost} alt="PinPost" className="h-6 w-auto" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden md:inline">{user?.email}</span>
          {hasActiveUploads && (
            <span role="status" aria-live="polite" className="text-xs text-muted-foreground animate-pulse">
              Uploading media…
            </span>
          )}
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>

          <ThemeToggle className="h-8 w-8" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex flex-1 overflow-hidden outline-none">
        {/* Editor pane */}
        <div className="flex w-full flex-col border-r border-border bg-card md:w-[420px] shrink-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Compose</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Profile fields */}
            <div className="flex items-center gap-3">
              <input
                ref={profileImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleProfileImage(e.target.files); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => profileImageRef.current?.click()}
                className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden transition-colors hover:border-primary/40 active:scale-95"
                aria-label="Upload profile image"
                title="Upload profile image"
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {displayName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </button>
              <div className="flex flex-1 gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="flex-1 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                    placeholder="handle"
                    className="w-full rounded-md border border-input bg-transparent pl-6 pr-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your post here…"
              className="w-full min-h-[180px] resize-none rounded-lg border border-input bg-transparent p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            />

            <div className="flex justify-end">
              <EnhanceButton text={text} onSelect={setText} />
            </div>

            {/* Character counts */}
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((p) => {
                const limit = PLATFORM_LIMITS[p];
                const count = text.length;
                const over = count > limit;
                return (
                  <div
                    key={p}
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                      over
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <span className="capitalize font-medium">{p === "x" ? "X" : p}</span>
                    <span className="font-mono tabular-nums">{count}/{limit}</span>
                  </div>
                );
              })}
            </div>

            {/* Format selector */}
            <div className="relative">
              <button
                onClick={() => setFormatOpen(!formatOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Format</span>
                  <span className="font-medium text-foreground">{FORMAT_PRESETS[selectedFormat].shortLabel}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${formatOpen ? "rotate-180" : ""}`} />
              </button>

              {formatOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFormatOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {FORMAT_KEYS.map((key) => {
                      const preset = FORMAT_PRESETS[key];
                      const dims = preset.platforms.instagram;
                      return (
                        <button
                          key={key}
                          onClick={() => { setSelectedFormat(key); setFormatOpen(false); }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors active:scale-[0.98] ${
                            selectedFormat === key
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <span className="font-medium">{preset.label}</span>
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">{dims.width}×{dims.height}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Media preview thumbnails */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((media) => {
                  const progress = uploadProgress[media.id];
                  const error = uploadErrors[media.id];
                  const isUploading = progress !== undefined;
                  const noPreview = !media.url && !media.uploaded;

                  return (
                    <div key={media.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      {noPreview ? (
                        <div className="flex h-full w-full items-center justify-center flex-col gap-1 p-2">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground text-center">Upload pending</span>
                        </div>
                      ) : media.type === "image" ? (
                        <img src={media.previewUrl || media.url} alt="Upload preview" className="h-full w-full object-cover" />
                      ) : (
                        <video src={media.previewUrl || media.url} className="h-full w-full object-cover" controls playsInline />
                      )}

                      {/* Real upload progress bar */}
                      {isUploading && (
                        <div className="absolute inset-x-0 bottom-0 bg-background/80 p-1.5">
                          <Progress value={progress} className="h-1.5" />
                          <span className="text-[9px] text-muted-foreground mt-0.5 block text-center">{progress}%</span>
                        </div>
                      )}

                      {/* Error with retry */}
                      {error && !isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                          <button
                            onClick={() => uploadFileImmediately(media)}
                            className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"
                          >
                            <RotateCw className="h-3 w-3" /> Retry
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeMedia(media.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:scale-95"
                        aria-label="Remove media"
                        title="Remove media"
                      >
                        <XIcon className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <div className="absolute bottom-1 left-1">
                        {media.type === "image" ? (
                          <FileImage className="h-3.5 w-3.5 text-background drop-shadow" />
                        ) : (
                          <FileVideo className="h-3.5 w-3.5 text-background drop-shadow" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Media upload drop zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex w-full items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-sm transition-colors active:scale-[0.98] ${
                dragOver
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                <Video className="h-4 w-4" />
              </div>
              <span>Add images or video</span>
            </button>
          </div>
        </div>

        {/* Preview pane */}
        <div className="hidden flex-1 flex-col md:flex">
          <div className="flex items-center gap-1 border-b border-border px-4 py-2 shrink-0">
            <button
              onClick={() => setActivePlatform("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
                activePlatform === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              All
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize active:scale-[0.97] ${
                  activePlatform === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {p === "x" ? "X" : p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 bg-surface">
            {activePlatform === "all" ? (
              <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                {platforms.map((p) => (
                  <PlatformPreview key={p} platform={p} text={text} media={mediaFiles} formatKey={selectedFormat} displayName={displayName} handle={handle} profileImageUrl={profileImageUrl} />
                ))}
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <PlatformPreview platform={activePlatform} text={text} media={mediaFiles} formatKey={selectedFormat} displayName={displayName} handle={handle} profileImageUrl={profileImageUrl} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
