import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PinPost — Preview your social posts across every platform" },
      { name: "description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { name: "author", content: "PinPost" },
      { property: "og:title", content: "PinPost — Preview your social posts across every platform" },
      { property: "og:description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "PinPost — Preview your social posts across every platform" },
      { name: "twitter:description", content: "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises." },
      { property: "og:image", content: "/social-preview.svg" },
      { name: "twitter:image", content: "/social-preview.svg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
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
      <Outlet />
    </AuthProvider>
  );
}
