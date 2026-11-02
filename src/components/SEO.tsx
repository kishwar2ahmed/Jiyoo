import React, { useEffect } from "react";
import { SITE_URL, SITE_NAME, toAbsoluteUrl } from "../utils/schemaGenerator";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "product" | "article";
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  noIndex?: boolean;
}

const DEFAULT_TITLE =
  "JIYOO | Buy Fresh Imported Fruits, Farm Vegetables & Custom-Cut Meat Online in India";
const DEFAULT_DESCRIPTION =
  "Order fresh imported & Indian fruits, daily farm-harvested vegetables, pure RO-water cleaned custom-cut chicken, mutton, coastal fish & prawns, cold-pressed smoothies, and wholesale fruit cartons online at JIYOO (FSSAI Lic. 21226112000732). Same-day express home delivery in Bengaluru & Pan-India wholesale supply.";
const DEFAULT_KEYWORDS =
  "JIYOO, jiyoo.co.in, buy fresh fruits online Bengaluru, imported fruits India, farm fresh vegetables online, RO water cleaned chicken delivery, fresh mutton curry cut Bangalore, coastal fish and prawns online, cold pressed smoothies Bangalore, wholesale imported fruits India, FSSAI certified meat and produce store";

function upsertMetaTag(
  attrName: "name" | "property",
  attrValue: string,
  content: string
) {
  let element = document.head.querySelector(
    `meta[${attrName}="${attrValue}"]`
  ) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  let link = document.head.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export const SEO: React.FC<SEOProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath = "/",
  ogImage = "/logo.jpg",
  ogType = "website",
  schema,
  noIndex = false,
}) => {
  useEffect(() => {
    const formattedTitle = title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;

    const fullCanonicalUrl = canonicalPath.startsWith("http")
      ? canonicalPath
      : `${SITE_URL}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

    const fullImageUrl = toAbsoluteUrl(ogImage);

    // 1. Document Title
    document.title = formattedTitle;

    // 2. Primary Meta Tags & Canonical
    upsertMetaTag("name", "description", description);
    upsertMetaTag("name", "keywords", keywords);
    upsertMetaTag(
      "name",
      "robots",
      noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );
    upsertCanonicalLink(fullCanonicalUrl);

    // 3. OpenGraph Tags (WhatsApp, Instagram, Facebook, LinkedIn)
    upsertMetaTag("property", "og:title", formattedTitle);
    upsertMetaTag("property", "og:description", description);
    upsertMetaTag("property", "og:url", fullCanonicalUrl);
    upsertMetaTag("property", "og:image", fullImageUrl);
    upsertMetaTag("property", "og:image:secure_url", fullImageUrl);
    upsertMetaTag("property", "og:image:alt", formattedTitle);
    upsertMetaTag("property", "og:type", ogType);
    upsertMetaTag("property", "og:site_name", SITE_NAME);
    upsertMetaTag("property", "og:locale", "en_IN");

    // 4. Twitter Card Tags
    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", formattedTitle);
    upsertMetaTag("name", "twitter:description", description);
    upsertMetaTag("name", "twitter:image", fullImageUrl);

    // 5. Dynamic JSON-LD Schema Injection
    const scriptId = "jiyoo-dynamic-jsonld";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      const payload = Array.isArray(schema)
        ? { "@context": "https://schema.org", "@graph": schema }
        : schema;
      scriptEl.textContent = JSON.stringify(payload);
    }
  }, [title, description, keywords, canonicalPath, ogImage, ogType, schema, noIndex]);

  return null;
};
