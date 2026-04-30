import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import logoPinpost from "@/assets/logo-pinpost.png";

export function Navbar() {
  const { user } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        if (window.scrollY > 20) {
          navRef.current.classList.add("scrolled");
        } else {
          navRef.current.classList.remove("scrolled");
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 opacity-0 -translate-y-2 pointer-events-none [&.scrolled]:opacity-100 [&.scrolled]:translate-y-0 [&.scrolled]:pointer-events-auto [&.scrolled]:border-b [&.scrolled]:border-border [&.scrolled]:bg-white [&.scrolled]:shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
      ref={navRef}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center text-foreground">
          <img src={logoPinpost} alt="PinPost" className="h-7 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#" className="transition-colors hover:text-foreground">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button size="sm" asChild>
              <Link to="/editor">Open editor</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Sign up free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
