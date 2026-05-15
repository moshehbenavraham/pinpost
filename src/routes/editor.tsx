import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "@/components/editor/PostEditor";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { buildHead } from "@/lib/seo";

const editorSearchSchema = z.object({
  draft: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/editor")({
  validateSearch: zodValidator(editorSearchSchema),
  head: () =>
    buildHead({
      title: "Editor",
      description: "Compose a post and preview it across every platform.",
      path: "/editor",
      noindex: true,
    }),
  component: EditorPage,
});

function EditorPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate, redirecting]);

  // Block ALL rendering until auth resolves or redirect completes
  if (loading || redirecting || (!loading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <PostEditor />;
}
