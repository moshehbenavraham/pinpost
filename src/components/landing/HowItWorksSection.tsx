import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Write your content",
    description: "Type your post in the unified editor. Character counts update in real time for every platform.",
  },
  {
    number: "02",
    title: "Upload your visuals",
    description: "Add images and see how they'll crop on each platform. Aspect ratio guides show you exactly what's visible.",
  },
  {
    number: "03",
    title: "Review every preview",
    description: "All four platform previews update as you type. Spot issues before your audience does.",
  },
  {
    number: "04",
    title: "Publish with confidence",
    description: "Export your optimized content or copy it directly to each platform. No more post-publish regrets.",
  },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
    <section id="how-it-works" className="py-24 md:py-32 bg-foreground">
      <div className="mx-auto max-w-6xl px-6" ref={ref}>
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-background md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
            From draft to pixel-perfect in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                filter: visible ? "blur(0)" : "blur(4px)",
                transition: `all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 100}ms`,
              }}
            >
              <span className="text-4xl font-bold text-background/15">{step.number}</span>
              <h3 className="mt-3 text-sm font-semibold text-background">{step.title}</h3>
              <p className="mt-1.5 text-sm text-background/60 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
