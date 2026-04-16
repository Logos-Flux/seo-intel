const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'to', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'how', 'what', 'best',
  'top', 'vs', 'near', 'me', 'my', 'your', 'can', 'do', 'does',
]);

/**
 * Extract the head term (first 2+ significant words) from a keyword.
 * "solar panel installation cost" → "solar-panel"
 * "off grid solar kit" → "off-grid"
 */
function extractHeadTerm(keyword: string): string {
  const words = keyword.toLowerCase().split(/\s+/).filter((w) => !STOP_WORDS.has(w));
  if (words.length < 2) return words[0] ?? 'other';
  return words.slice(0, 2).join('-');
}

/**
 * Cluster keywords by shared head terms.
 * Returns a map of keyword → cluster name (slugified).
 * Single-keyword clusters get merged into "other".
 */
export function clusterKeywords(keywords: string[]): Map<string, string> {
  // Group by head term
  const groups = new Map<string, string[]>();
  for (const kw of keywords) {
    const head = extractHeadTerm(kw);
    const list = groups.get(head) ?? [];
    list.push(kw);
    groups.set(head, list);
  }

  // Assign clusters; merge singletons into "other"
  const result = new Map<string, string>();
  for (const [head, members] of groups) {
    const cluster = members.length >= 2 ? head : 'other';
    for (const kw of members) {
      result.set(kw, cluster);
    }
  }

  return result;
}
