import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Hand-rolled theme system for PinPost.
 *
 * TanStack Start is SSR — we mount a `<script>` in `__root.tsx` that resolves
 * the initial theme and toggles `.dark` on `<html>` BEFORE React hydrates, so
 * dark-OS visitors never see a light-mode flash on first paint.
 *
 * This hook subscribes to:
 *  - `localStorage('pinpost-theme')` for explicit user choice
 *  - `prefers-color-scheme: dark` mediaquery for the "system" fallback
 *
 * `theme` is the user-facing setting (light | dark | system); `resolvedTheme`
 * is the actual class applied to <html> (always light | dark).
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const STORAGE_KEY = "pinpost-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may throw in privacy mode — fall through to default.
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // On the server we render "system" so HTML matches what the bootstrap script
  // produced; the post-hydration effect below reconciles with localStorage.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "light" : getSystemTheme(),
  );

  // Read stored preference once after mount.
  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    const resolved = resolveTheme(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Live-update when OS theme changes (only while in "system" mode).
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = getSystemTheme();
      setResolvedTheme(next);
      applyTheme(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — preference is best-effort persistence.
    }
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Allow components that import the hook without a provider mounted (e.g.
    // during SSR fallback) — degrade to a passive light-mode shim instead of
    // throwing and breaking the render.
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => {},
    };
  }
  return ctx;
}

/**
 * Inline script that runs before React hydrates. Must be kept in sync with
 * `STORAGE_KEY` and the `applyTheme` logic above. Reads the stored preference,
 * falls back to `prefers-color-scheme: dark`, and toggles the `.dark` class
 * plus `colorScheme` on <html> so the first paint matches the user's choice.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var key = ${JSON.stringify(STORAGE_KEY)};
    var stored = null;
    try { stored = window.localStorage.getItem(key); } catch (e) {}
    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var resolved = theme === "system"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    var root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark");
    root.style.colorScheme = resolved;
  } catch (e) {
    // Best-effort only — if anything throws we just fall back to the light default.
  }
})();
`.trim();
