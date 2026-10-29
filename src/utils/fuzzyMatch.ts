import { Product } from '../types';

// Dependency-free search & strict typo-tolerance helper for JIYOO catalog search.
// Prevents random/gibberish queries from matching unrelated products while still
// handling genuine 1-character typos (e.g. "chiken", "mangoo", "avacado").

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// Strict typo distance:
// - Short words (< 4 chars) require exact/prefix match (0 typos allowed)
// - Medium words (4..6 chars) allow at most 1 edit
// - Long words (7+ chars) allow at most 2 edits
function maxAllowedDistance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

function normalizePlural(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokenExactOrPrefixMatches(token: string, query: string): boolean {
  if (!token || !query) return false;
  if (token === query) return true;
  // Prefix match: e.g. "man" -> "mango", "chic" -> "chicken"
  if (token.startsWith(query)) return true;
  // Plural/singular equivalence: e.g. "mangoes" <-> "mango", "apples" <-> "apple"
  const normToken = normalizePlural(token);
  const normQuery = normalizePlural(query);
  if (normToken.length >= 3 && (normToken === normQuery || normToken.startsWith(normQuery))) {
    return true;
  }
  // Substring inside a compound product word only when query is at least 3 chars
  // (e.g. "berry" in "strawberry", "melon" in "watermelon")
  if (query.length >= 3 && token.includes(query)) return true;
  return false;
}

function tokenFuzzyMatches(token: string, query: string): boolean {
  if (!token || !query) return false;
  if (tokenExactOrPrefixMatches(token, query)) return true;

  // Typo tolerance only for words of at least 4 characters
  if (token.length < 4 || query.length < 4) return false;

  // First letter must match to avoid random gibberish matching unrelated words
  if (token[0] !== query[0]) return false;

  // Length difference cannot exceed 1 character
  if (Math.abs(token.length - query.length) > 1) return false;

  const distance = levenshtein(token, query);
  return distance <= maxAllowedDistance(Math.min(token.length, query.length));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

/**
 * Returns true if every word in searchQuery has a strict prefix/typo-tolerant
 * match among target's words. Never matches empty or symbol-only queries.
 */
export function fuzzyTextMatch(target: string, searchQuery: string): boolean {
  const targetLower = target.toLowerCase().trim();
  const queryLower = searchQuery.toLowerCase().trim();
  if (!queryLower || !targetLower) return false;

  const queryWords = queryLower.split(/[^a-z0-9]+/).filter(Boolean);
  if (queryWords.length === 0) return false;

  const targetWords = tokenize(targetLower);
  if (targetWords.length === 0) return false;

  return queryWords.every((qWord) =>
    targetWords.some((tWord) => tokenFuzzyMatches(tWord, qWord))
  );
}

/**
 * Filters and ranks catalog products for a user search query.
 * - Matches against product name, tags, and category/subcategory identifiers.
 * - Does NOT match random filler words inside long product descriptions.
 * - Returns an empty array for random/unrelated gibberish.
 */
export function searchCatalogProducts(products: Product[], rawQuery: string): Product[] {
  const queryLower = rawQuery.toLowerCase().trim();
  if (!queryLower) return [];

  const queryWords = queryLower.split(/[^a-z0-9]+/).filter(Boolean);
  // If user typed only symbols/punctuation, return no results
  if (queryWords.length === 0) return [];

  const scoredExact: { product: Product; score: number }[] = [];

  for (const product of products) {
    const nameLower = product.name.toLowerCase();
    const nameWords = tokenize(nameLower);
    const tagWords = (product.tags ?? []).flatMap((t) => tokenize(t));
    const categoryWords = [
      ...tokenize(product.categoryId || ''),
      ...tokenize(product.subcategoryId || ''),
    ];

    let score = 0;

    // 1. Full query matches start of product name
    if (nameLower === queryLower) {
      score = 100;
    } else if (nameLower.startsWith(queryLower)) {
      score = 90;
    } else if (
      queryWords.every((qw) => nameWords.some((nw) => tokenExactOrPrefixMatches(nw, qw)))
    ) {
      // Every query word matches a word in the product name (prefix, exact, plural, or >=3 char compound)
      const allStart = queryWords.every((qw) => nameWords.some((nw) => nw.startsWith(qw)));
      score = allStart ? 80 : 65;
    } else if (
      queryLower.length >= 3 &&
      queryWords.every((qw) =>
        [...nameWords, ...tagWords, ...categoryWords].some((tw) =>
          tokenExactOrPrefixMatches(tw, qw)
        )
      )
    ) {
      score = 50;
    }

    if (score > 0) {
      scoredExact.push({ product, score });
    }
  }

  if (scoredExact.length > 0) {
    return scoredExact
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);
  }

  // Fallback: strict typo-tolerant match on product name and tags ONLY (never description)
  // Requires every query word to be at least 4 characters long so short random strings
  // like "asd", "xyz", "qwe" never trigger fuzzy fallback.
  if (queryWords.some((qw) => qw.length < 4)) {
    return [];
  }

  return products.filter(
    (p) =>
      fuzzyTextMatch(p.name, queryLower) ||
      (p.tags?.some((tag) => fuzzyTextMatch(tag, queryLower)) ?? false)
  );
}
