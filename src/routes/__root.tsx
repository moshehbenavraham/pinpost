import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { buildHead, buildSiteJsonLd } from "@/lib/seo";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => {
    const { meta, links } = buildHead({ path: "/" });
    return {
      meta,
      links: [
        ...links,
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/social-preview.svg", type: "image/svg+xml" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: buildSiteJsonLd(),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
