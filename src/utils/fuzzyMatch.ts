// Small, dependency-free fuzzy-match helper for typo-tolerant search.
// Not a replacement for a real search index -- just enough that an
// obvious one- or two-character typo ("tomatoe", "banaan") still returns
// results, which a plain substring match does not.

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

// Allowed typo distance scales gently with word length so short words
// still require a near-exact match (otherwise "tea" would fuzzy-match
// half the catalog).
function maxAllowedDistance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

function tokenFuzzyMatches(token: string, query: string): boolean {
  if (!token || !query) return false;
  if (token.includes(query) || query.includes(token)) return true;
  const distance = levenshtein(token, query);
  return distance <= maxAllowedDistance(Math.max(token.length, query.length));
}

/**
 * Returns true if every word in searchQuery has at least one reasonably
 * close (typo-tolerant) match among target's words. Intended as a fallback
 * after an exact substring match has already been tried and missed.
 */
export function fuzzyTextMatch(target: string, searchQuery: string): boolean {
  const targetLower = target.toLowerCase();
  const queryLower = searchQuery.toLowerCase().trim();
  if (!queryLower) return true;
  if (targetLower.includes(queryLower)) return true;

  const targetWords = targetLower.split(/[^a-z0-9]+/).filter(Boolean);
  const queryWords = queryLower.split(/[^a-z0-9]+/).filter(Boolean);
  if (queryWords.length === 0) return true;

  return queryWords.every((qWord) => targetWords.some((tWord) => tokenFuzzyMatches(tWord, qWord)));
}
