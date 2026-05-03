import { DataForSEOClient } from './dataforseo/client';

const AI_GATEWAY_URL = 'https://gateway.ai.cloudflare.com/v1/da428703889b8aae0baf5fd8acafcdd5/research-gateway/compat/chat/completions';

interface DiscoveredCompetitor {
  domain: string;
  reason: string;
  verified: boolean;
}

export async function discoverCompetitors(
  profileName: string,
  profileDomain: string,
  rankedKeywords: { keyword: string; position: number }[],
  topKeywords: string[],
  seedKeywords: string[],
  cfApiGateway: string
): Promise<DiscoveredCompetitor[]> {
  const rankedList = rankedKeywords.map((k) => `${k.keyword} (#${k.position})`).join(', ');
  const topKwList = topKeywords.join(', ');

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'cf-aig-authorization': `Bearer ${cfApiGateway}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google-ai-studio/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an SEO competitive analyst. Your job is to identify DIRECT business competitors — companies that a potential customer would consider as alternatives when deciding who to buy from.

Rules:
- Return ONLY a JSON array. No markdown, no explanation.
- Each entry: {"domain": "example.com", "reason": "one sentence why they compete"}
- Return 10-20 competitors, ranked by how directly they compete.
- ONLY include companies that sell similar products/services to the same buyer persona.
- Competitors must have their own website with a real business behind it.

EXCLUDE these categories entirely:
- Media/news sites (forbes.com, inc.com, entrepreneur.com, businessinsider.com)
- Job boards (indeed.com, glassdoor.com, linkedin.com)
- Marketplaces (amazon.com, ebay.com, etsy.com, alibaba.com)
- Generic platforms (shopify.com, wix.com, wordpress.com, hubspot.com)
- Government/education (sba.gov, score.org, .edu domains)
- Social media (facebook.com, instagram.com, twitter.com, reddit.com, youtube.com)
- Freelance platforms (fiverr.com, upwork.com)
- Content farms or SEO-only sites with no real product/service
- Wikipedia, Quora, or any Q&A/reference site

The test: "Would a customer choosing between ${profileName} and this company be making the same type of purchase decision?" If no, exclude it.`,
        },
        {
          role: 'user',
          content: `Find direct business competitors for ${profileName} (${profileDomain}).

Here is what we know about this business from their SEO data:
- They rank for keywords like: ${rankedList || 'no ranking data yet'}
- Their top keywords by volume: ${topKwList || 'no keyword data yet'}
- Seed keywords: ${seedKeywords.join(', ') || 'none'}

Based on this SEO footprint, identify companies that compete for the same customers and keywords. Focus on businesses of similar type — if this is a service company, find other service companies; if product company, find product companies. Prioritize competitors that a potential customer would realistically compare against.`,
        },
      ],
      temperature: 0.2,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`AI Gateway error ${response.status}: ${responseText.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`AI Gateway returned invalid JSON`);
  }

  const content = data.choices?.[0]?.message?.content ?? '[]';
  let rawCompetitors: { domain: string; reason: string }[] = [];
  try {
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    rawCompetitors = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI competitor response`);
  }

  // Verify domains
  const verified: DiscoveredCompetitor[] = [];
  await Promise.all(rawCompetitors.map(async (comp) => {
    const domain = comp.domain.toLowerCase().replace(/^www\./, '');
    try {
      const res = await fetch(`https://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      verified.push({ domain, reason: comp.reason, verified: res.ok || res.status < 500 });
    } catch {
      try {
        const res = await fetch(`https://www.${domain}`, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        verified.push({ domain, reason: comp.reason, verified: res.ok || res.status < 500 });
      } catch {
        verified.push({ domain, reason: comp.reason, verified: false });
      }
    }
  }));

  verified.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
  return verified;
}

export async function enrichAndStoreCompetitors(
  profileId: string,
  competitors: string[],
  db: import('../lib/d1-shim').D1Compat,
  client: DataForSEOClient
): Promise<Record<string, string>> {
  // Save to profile
  await db.prepare('UPDATE profiles SET competitors_json = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(JSON.stringify(competitors), profileId).run();

  // Clear old snapshots
  await db.prepare('DELETE FROM competitor_snapshots WHERE profile_id = ?').bind(profileId).run();

  const results: Record<string, string> = {};
  for (const domain of competitors) {
    try {
      const snapshot = await client.getFullDomainSnapshot(domain);
      await db.prepare(`
        INSERT INTO competitor_snapshots (id, profile_id, domain, organic_traffic, organic_keywords, paid_traffic, paid_keywords, backlinks, referring_domains)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), profileId, domain,
        snapshot.organic_traffic, snapshot.organic_keywords,
        snapshot.paid_traffic, snapshot.paid_keywords,
        snapshot.backlinks, snapshot.referring_domains,
      ).run();
      results[domain] = 'ok';
    } catch (err: any) {
      results[domain] = err.message ?? 'failed';
    }
  }

  return results;
}
