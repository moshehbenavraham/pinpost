import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SocialCarousel } from "./SocialCarousel";
import logoPinpost from "@/assets/logo-pinpost.png";


export function HeroSection() {
  const { user } = useAuth();
  const ctaLink = user ? "/editor" : "/login";

  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
      {/* Blue tint layer */}
      <div
        className="absolute inset-0 top-[30%]"
        style={{
          background: "linear-gradient(180deg, transparent 0%, oklch(0.94 0.04 230) 25%, oklch(0.94 0.04 230) 75%, transparent 100%)",
        }}
      />
      {/* Dot grid layer with gradient mask */}
      <div
        className="absolute inset-0 top-[30%]"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(0.60 0.14 230 / 0.6) 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 100% 70% at 50% 55%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 70% at 50% 55%, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <img src={logoPinpost} alt="PinPost" className="mx-auto mb-8 h-12 md:h-16 w-auto" />
          <h1
            className="text-4xl font-semibold tracking-tight text-foreground opacity-0 animate-fade-up md:text-6xl"
            style={{ lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            See exactly how your post looks before the world does
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground opacity-0 animate-fade-up-delay"
            style={{ textWrap: "pretty" }}
          >
            Preview your content across Instagram, LinkedIn, X, and Facebook — all in one editor. Completely free, no catches.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 opacity-0 animate-fade-up-delay">
            <Button variant="hero" size="xl" asChild>
              <Link to={ctaLink}>
                {user ? "Open editor" : "Get started — it's free"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative">
        <SocialCarousel />
      </div>
    </section>
  );
}
