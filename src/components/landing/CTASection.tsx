import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-24 md:py-32">
      <div
        ref={ref}
        className="mx-auto max-w-3xl px-6 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          filter: visible ? "blur(0)" : "blur(4px)",
          transition: "all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
          Stop guessing. Start previewing.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Free for everyone. No credit card, no limits.
        </p>
        <div className="mt-8">
          <Button variant="hero" size="xl" asChild>
            <Link to={user ? "/editor" : "/login"}>
              {user ? "Open editor" : "Get started free"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
