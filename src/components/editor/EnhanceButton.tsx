import { useState } from "react";
import { Sparkles, Loader2, X as XIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLATFORM_LIMITS = {
  instagram: 2200,
  linkedin: 3000,
  x: 280,
  facebook: 63206,
} as const;

type Platform = keyof typeof PLATFORM_LIMITS;

interface Suggestion {
  label: string;
  text: string;
}

interface EnhanceButtonProps {
  text: string;
  onSelect: (text: string) => void;
}

export function EnhanceButton({ text, onSelect }: EnhanceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const enhance = async () => {
    if (!text.trim()) {
      toast.error("Write something first before enhancing.");
      return;
    }

    setLoading(true);
    setSuggestions(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Please log in to use AI enhance.");
        return;
      }

      const resp = await fetch("/api/enhance-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        toast.error(data.error || "Failed to enhance post.");
        return;
      }

      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        toast.error("Unexpected response from AI.");
      }
    } catch (e) {
      console.error("Enhance error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion.text);
    setSuggestions(null);
    toast.success(`Applied "${suggestion.label}" variation.`);
  };

  const platforms: Platform[] = ["instagram", "linkedin", "x", "facebook"];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={enhance}
        disabled={loading || !text.trim()}
        className="gap-1.5 text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enhancing…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Enhance with AI
          </>
        )}
      </Button>

      {suggestions && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
            onClick={() => setSuggestions(null)}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-xl border border-border bg-popover p-4 shadow-xl sm:inset-x-auto sm:w-[480px]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Pick a variation
              </h3>
              <button
                onClick={() => setSuggestions(null)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {suggestions.map((s, i) => {
                return (
                  <div
                    key={i}
                    className="group rounded-lg border border-border bg-background p-3 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleSelect(s)}
                      >
                        <Check className="h-3 w-3" />
                        Use this
                      </Button>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {s.text}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {platforms.map((p) => {
                        const limit = PLATFORM_LIMITS[p];
                        const count = s.text.length;
                        const over = count > limit;
                        return (
                          <span
                            key={p}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                              over
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p === "x" ? "X" : p} {count}/{limit}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
