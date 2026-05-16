import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/hooks/useTheme";

const ORDER: Theme[] = ["light", "dark", "system"];

const LABEL: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
};

const NEXT_LABEL: Record<Theme, string> = {
  light: "Switch to dark mode",
  dark: "Switch to system mode",
  system: "Switch to light mode",
};

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") return <Sun className="h-4 w-4" aria-hidden="true" />;
  if (theme === "dark") return <Moon className="h-4 w-4" aria-hidden="true" />;
  return <Monitor className="h-4 w-4" aria-hidden="true" />;
}

/**
 * Cycle button: Light → Dark → System → Light.
 *
 * Rendered as a child of `Button asChild`-style ghost icon so it inherits the
 * existing iconography of the dashboard header / navbar.
 */
export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string;
  size?: "icon" | "sm";
}) {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatches: render a neutral icon on the server, then swap
  // to the real one once the client has read localStorage.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      onClick={() => setTheme(next)}
      aria-label={NEXT_LABEL[current]}
      title={`${LABEL[current]} · ${NEXT_LABEL[current]}`}
    >
      <ThemeIcon theme={current} />
      <span className="sr-only">{LABEL[current]}</span>
    </Button>
  );
}
