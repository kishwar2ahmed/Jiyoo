import { Product } from "../types";

export const SITE_URL = "https://www.jiyoo.co.in";
export const SITE_NAME = "JIYOO";

export function toAbsoluteUrl(pathOrUrl?: string): string {
  if (!pathOrUrl) return `${SITE_URL}/logo.jpg`;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${encodeURI(cleanPath)}`;
}

export function extractNumericPrice(product: Product): number {
  if (typeof product.numericPrice === "number" && product.numericPrice > 0) {
    return product.numericPrice;
  }
  if (typeof product.price === "number" && product.price > 0) {
    return product.price;
  }
  const parsed = parseFloat(String(product.price || "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 99;
}

/**
 * 1. Organization & WebSite Schema for Homepage
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "GroceryStore"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "SHAM'S - JIYOO Fresh Foods & Wholesale",
    url: SITE_URL,
    logo: `${SITE_URL}/jiyoo.logo.jpeg`,
    image: `${SITE_URL}/logo.jpg`,
    description:
      "Buy fresh imported & Indian fruits, daily farm vegetables, pure RO-water cleaned custom-cut chicken, mutton, coastal fish, prawns, cold-pressed smoothies, and wholesale master cartons online in India.",
    telephone: "+91-9739391891",
    email: "shamsjiyoo@gmail.com",
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Google Pay, PhonePe, Paytm, Credit Card, Debit Card, NetBanking, Cash on Delivery",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Thanisandra Main Road, Nagavara & North Bengaluru Cold-Chain Hub",
      addressLocality: "Bengaluru",
      addressRegion: "Karnataka",
      postalCode: "560045",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 13.0458,
      longitude: 77.6196,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "07:00",
        closes: "22:00",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-9739391891",
        contactType: "customer service",
        email: "shamsjiyoo@gmail.com",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi", "Kannada"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+91-9739391891",
        contactType: "sales",
        email: "jiyooshams@gmail.com",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi", "Kannada"],
      },
    ],
    sameAs: [
      "https://www.instagram.com/shamsjiyoo2026",
      "https://wa.me/919739391891",
    ],
    identifier: [
      {
        "@type": "PropertyValue",
        name: "FSSAI License Number",
        value: "21226112000732",
      },
      {
        "@type": "PropertyValue",
        name: "MSME Udyam Registration",
        value: "UDYAM-KR-19-0005999",
      },
    ],
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "JIYOO Fresh Fruits, Vegetables, Meat & Wholesale India",
    url: SITE_URL,
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * 2. Individual Product Schema (Google Shopping & Merchant Listing Ready)
 */
export function generateProductSchema(product: Product) {
  const price = extractNumericPrice(product);
  const slugOrId = product.slug || String(product.id);
  const productUrl = `${SITE_URL}/?category=${encodeURIComponent(product.categoryId)}&product=${encodeURIComponent(slugOrId)}`;
  const isAvailable =
    product.stock !== 0 && product.stockStatus !== "out_of_stock";

  const images = Array.from(
    new Set([product.image, ...(product.images || [])].filter(Boolean))
  ).map((img) => toAbsoluteUrl(img));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/#product-${slugOrId}`,
    name: product.name,
    image: images.length > 0 ? images : [`${SITE_URL}/logo.jpg`],
    description:
      product.description ||
      `Buy fresh ${product.name} online from JIYOO (${product.unit || "Fresh Pack"}). Hygienically packed, FSSAI certified (21226112000732), and delivered fresh across Bengaluru & India.`,
    sku: `JIYOO-${String(product.id).toUpperCase()}`,
    mpn: `JIYOO-${slugOrId.toUpperCase()}`,
    category: product.categoryId,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: price.toFixed(2),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0.00",
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 1,
        returnMethod: "https://schema.org/ReturnInStore",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
}

/**
 * 3. ItemList Schema for Category & Storefront Product Catalog
 */
export function generateItemListSchema(
  products: Product[],
  listName = "JIYOO Fresh Fruits, Vegetables, Meat & Wholesale Catalog",
  canonicalPath = "/"
) {
  const cleanCanonical = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: `${SITE_URL}${cleanCanonical}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 60).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: generateProductSchema(product),
    })),
  };
}

/**
 * 4. BreadcrumbList Schema for Inner Views & Categories
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http")
        ? item.url
        : `${SITE_URL}${item.url.startsWith("/") ? item.url : `/${item.url}`}`,
    })),
  };
}
