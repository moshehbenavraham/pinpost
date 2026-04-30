import { PreviewCard } from "./PreviewCard";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
            Everything you need to preview with confidence
          </h2>
          <p className="mt-4 text-muted-foreground">
            One editor. Four platforms. Zero guesswork.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -top-3 left-6 z-10 flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-live" />
            Live preview
          </div>
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="border-b border-border bg-surface px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="ml-4 flex-1 rounded-md bg-background border border-border px-3 py-1 text-xs text-muted-foreground">
                pinpost.app/editor
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border">
              <PreviewCard platform="instagram" />
              <PreviewCard platform="linkedin" />
              <PreviewCard platform="x" />
              <PreviewCard platform="facebook" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
