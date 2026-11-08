import { Category, Product } from "../types";

const DEFAULT_TITLE = "JIYOO – Fresh Fruits, Vegetables, Meat & Wholesale Boxes";
const DEFAULT_DESCRIPTION =
  "Order fresh imported & Indian fruits, farm vegetables, RO-cleaned chicken, mutton, fish & wholesale product boxes at JIYOO. Fast delivery in Bengaluru & India.";

function setMetaContent(selector: string, attrName: string, attrValue: string, content: string) {
  if (typeof document === "undefined") return;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonicalUrl(url: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setDynamicJsonLd(data: Record<string, unknown> | null) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("jiyoo-dynamic-jsonld");
  if (!data) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = "jiyoo-dynamic-jsonld";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function updateDocumentSeo({
  title,
  description,
  canonicalPath = "/",
  image,
  jsonLd = null,
}: {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const finalTitle = title ? title.slice(0, 70) : DEFAULT_TITLE;
  const finalDescription = description ? description.slice(0, 165) : DEFAULT_DESCRIPTION;
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${origin}${image.startsWith("/") ? image : `/${image}`}`
    : `${origin}/og-image.png`;

  document.title = finalTitle;
  setMetaContent('meta[name="description"]', "name", "description", finalDescription);
  setMetaContent('meta[property="og:title"]', "property", "og:title", finalTitle);
  setMetaContent('meta[property="og:description"]', "property", "og:description", finalDescription);
  setMetaContent('meta[property="og:url"]', "property", "og:url", canonicalUrl);
  setMetaContent('meta[property="og:image"]', "property", "og:image", ogImage);
  setMetaContent('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
  setMetaContent('meta[name="twitter:description"]', "name", "twitter:description", finalDescription);
  setMetaContent('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  setCanonicalUrl(canonicalUrl);
  setDynamicJsonLd(jsonLd);
}

export function applyWholesaleSeo(boxCount: number) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://jiyoo.com";
  updateDocumentSeo({
    title: "Wholesale Product Boxes – Bulk Fruits & Produce India | JIYOO",
    description: `Buy ${boxCount || "fresh"} wholesale product boxes & master cartons at direct import rates from JIYOO. Start with just 1 box. Fast delivery across Bengaluru & all over India.`,
    canonicalPath: "/?view=wholesale",
    image: "/banners/wholesale_india_banner.jpg",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "JIYOO Wholesale Product Boxes",
      description:
        "Direct wholesale boxes and master cartons of fresh imported fruits and produce with pan-India delivery.",
      url: `${origin}/?view=wholesale`,
      isPartOf: {
        "@type": "WebSite",
        name: "JIYOO",
        url: origin,
      },
    },
  });
}

export function applyCategorySeo(category?: Category | null, products?: Product[]) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://jiyoo.com";
  if (!category || category.id === "all") {
    updateDocumentSeo({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalPath: "/",
      jsonLd: null,
    });
    return;
  }

  const label = category.label || "Fresh Products";
  const topItems = (products || []).slice(0, 10);

  updateDocumentSeo({
    title: `${label} Online Delivery in Bengaluru | JIYOO`,
    description: `Order fresh ${label.toLowerCase()} online in Bengaluru from JIYOO. Handpicked daily, hygienically packed & delivered fast to your doorstep.`,
    canonicalPath: `/?category=${encodeURIComponent(category.id)}`,
    image: topItems[0]?.image || "/og-image.png",
    jsonLd:
      topItems.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${label} at JIYOO`,
            numberOfItems: topItems.length,
            itemListElement: topItems.map((p, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              item: {
                "@type": "Product",
                name: p.name,
                image: p.image?.startsWith("http") ? p.image : `${origin}${p.image || "/og-image.png"}`,
                description: p.description || `Fresh ${p.name} (${p.unit || "1 kg"}) delivered by JIYOO.`,
                brand: {
                  "@type": "Brand",
                  name: p.brand || "JIYOO",
                },
                offers: {
                  "@type": "Offer",
                  priceCurrency: "INR",
                  price: String(p.numericPrice ?? p.price ?? 0).replace(/[^0-9.]/g, "") || "0",
                  availability:
                    p.stockStatus === "out_of_stock"
                      ? "https://schema.org/OutOfStock"
                      : "https://schema.org/InStock",
                },
              },
            })),
          }
        : null,
  });
}

export function applyProductModalSeo(product: Product | null) {
  if (!product) return;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://jiyoo.com";
  const priceNum =
    typeof product.numericPrice === "number" && product.numericPrice > 0
      ? product.numericPrice
      : parseFloat(String(product.price).replace(/[^0-9.]/g, "")) || 0;
  const unitText = product.unit ? ` (${product.unit})` : "";
  const productImage = product.image?.startsWith("http")
    ? product.image
    : `${origin}${product.image || "/og-image.png"}`;

  updateDocumentSeo({
    title: `${product.name}${unitText} – ₹${priceNum} | JIYOO`,
    description:
      product.description ||
      `Buy fresh ${product.name}${unitText} online at ₹${priceNum} from JIYOO. Hygienically packed with express delivery in Bengaluru.`,
    canonicalPath: `/?product=${encodeURIComponent(String(product.id))}`,
    image: product.image || "/og-image.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: [productImage],
      description:
        product.description ||
        `Fresh ${product.name}${unitText} curated and delivered by JIYOO.`,
      sku: String(product.id),
      brand: {
        "@type": "Brand",
        name: product.brand || "JIYOO",
      },
      offers: {
        "@type": "Offer",
        url: `${origin}/?product=${encodeURIComponent(String(product.id))}`,
        priceCurrency: "INR",
        price: String(priceNum),
        availability:
          product.stockStatus === "out_of_stock"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: "JIYOO (SHAM'S™)",
        },
      },
    },
  });
}
