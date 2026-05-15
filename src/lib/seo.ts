/**
 * Centralized SEO for PinPost.
 *
 * NOTE: SITE_URL is currently set to https://pinpost.app based on the in-app
 * mock browser bar in FeaturesSection. Override here when the canonical
 * production hostname is confirmed.
 */

export const SITE_URL = "https://pinpost.app";
export const SITE_NAME = "PinPost";
export const SITE_TAGLINE = "Preview your social posts across every platform";
export const SITE_DESCRIPTION =
  "See exactly how your content renders on Instagram, LinkedIn, X, and Facebook before you publish. One editor, four platforms, zero surprises.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/social-preview.svg`;

// TanStack Start's head() typing is permissive; use loose Records so we don't
// fight the framework on optional keys like `name`/`property`/`content`/`title`.
export type MetaEntry = Record<string, string>;
export type LinkEntry = Record<string, string>;
export type ScriptEntry = { type?: string; children?: string; src?: string };

export interface BuildHeadOptions {
  title?: string;
  description?: string;
  /** Pathname starting with `/`. Used for canonical and og:url. Omit for root. */
  path?: string;
  /** If true, emit robots: noindex,nofollow (use for auth-walled routes). */
  noindex?: boolean;
  /** Absolute URL or path. Defaults to DEFAULT_OG_IMAGE. */
  image?: string;
  /** og:type, defaults to "website". */
  ogType?: string;
}

function absolute(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function buildHead(options: BuildHeadOptions = {}): {
  meta: MetaEntry[];
  links: LinkEntry[];
} {
  const title = options.title
    ? `${options.title} — ${SITE_NAME}`
    : `${SITE_NAME} — ${SITE_TAGLINE}`;
  const description = options.description ?? SITE_DESCRIPTION;
  const url = `${SITE_URL}${options.path ?? "/"}`;
  const image = absolute(options.image) ?? DEFAULT_OG_IMAGE;
  const ogType = options.ogType ?? "website";

  const meta: MetaEntry[] = [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title },
    { name: "description", content: description },
    { name: "author", content: SITE_NAME },
    { name: "application-name", content: SITE_NAME },
    { name: "theme-color", content: "#2f7ed8" },
    // Open Graph
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    // Twitter / X
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (options.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  } else {
    meta.push({
      name: "robots",
      content: "index, follow, max-image-preview:large",
    });
  }

  const links: LinkEntry[] = [{ rel: "canonical", href: url }];

  return { meta, links };
}

/**
 * Returns a JSON-LD @graph string covering the WebSite, Organization,
 * and SoftwareApplication entities for the homepage. Inject in __root.tsx
 * via `scripts: [{ type: "application/ld+json", children: buildSiteJsonLd() }]`.
 */
export function buildSiteJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: DEFAULT_OG_IMAGE,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Instagram post preview",
          "LinkedIn post preview",
          "X (Twitter) post preview",
          "Facebook post preview",
          "AI-assisted post enhancement",
          "Real-time character counts per platform",
        ],
      },
    ],
  });
}
