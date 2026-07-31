import { llm, extractJson } from "./zai";

export interface LeadScore {
  recipientId: string;
  email: string;
  name?: string;
  company?: string;
  score: number; // 0-100
  tier: "hot" | "warm" | "cold";
  fit: string; // 1-line reason
  signal: string; // what domain/email tells us
}

export interface LeadScoringResult {
  scores: LeadScore[];
  summary: {
    hot: number;
    warm: number;
    cold: number;
    avgScore: number;
  };
}

const SYSTEM = `You are MarketMind's LeadScorer agent — a B2B lead analyst who scores cold-email prospects for ICP fit using lightweight email/domain heuristics.

Scoring signals:
- Domain type: company domain (e.g. acme.com) > generic (gmail/yahoo/outlook). Company domains usually indicate a real business.
- Company TLD: .com/.io/.ai/.co/.app → startup/SaaS lean; .edu/.gov → niche; regional TLDs → locale signal.
- Name + company match: a named person at a named company scores higher.
- Audience fit: does the email/company pattern match the stated target audience?

Score bands:
- 70-100 = hot (strong fit signal)
- 40-69 = warm (some signal)
- 0-39 = cold (generic/no signal)

Be decisive but fair. Respond in valid JSON only.`;

/**
 * LeadScorer agent.
 * Batches recipients through one LLM call with a compact representation
 * to keep token usage low while still personalized.
 */
export class LeadScorer {
  async run(params: {
    recipients: { id: string; email: string; name?: string | null; company?: string | null }[];
    productName: string;
    targetAudience: string;
  }): Promise<LeadScoringResult> {
    const { recipients, productName, targetAudience } = params;

    if (recipients.length === 0) {
      return {
        scores: [],
        summary: { hot: 0, warm: 0, cold: 0, avgScore: 0 },
      };
    }

    const compact = recipients.map((r, i) => ({
      i,
      id: r.id,
      email: r.email,
      name: r.name || "",
      company: r.company || "",
    }));

    const prompt = `Score these ${recipients.length} cold-email leads for fit with this campaign.

Campaign product: ${productName}
Target audience: ${targetAudience}

Leads (JSON array):
${JSON.stringify(compact)}

Return STRICT JSON:
{
  "scores": [
    {"i":0,"score":0-100,"tier":"hot|warm|cold","fit":"1-line fit reason","signal":"domain/email signal observed"}
  ]
}

Score every lead. Index "i" must match the input order. No markdown.`;

    const raw = await llm(SYSTEM, prompt);
    const parsed = extractJson<{ scores: { i: number; score: number; tier: string; fit: string; signal: string }[] }>(raw);

    const scores: LeadScore[] = [];
    const rawScores = parsed?.scores || [];

    // Normalize LLM-returned tier to lowercase; fall back to score-based tier
    function normalizeTier(tier: unknown, score: number): LeadScore["tier"] {
      const t = String(tier || "").toLowerCase().trim();
      if (t === "hot" || t === "warm" || t === "cold") return t;
      return score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
    }

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      // Prefer index-match by the `i` field; only fall back to positional
      // match if the LLM omitted the index entirely.
      let matched = rawScores.find((s) => s.i === i);
      if (!matched && i < rawScores.length && rawScores[i] && rawScores[i].i === undefined) {
        matched = rawScores[i];
      }
      let score = typeof matched?.score === "number" ? matched.score : 50;
      score = Math.max(0, Math.min(100, Math.round(score)));
      const tier = normalizeTier(matched?.tier, score);
      scores.push({
        recipientId: r.id,
        email: r.email,
        name: r.name || undefined,
        company: r.company || undefined,
        score,
        tier,
        fit: matched?.fit || "No signal analyzed",
        signal: matched?.signal || "",
      });
    }

    const hot = scores.filter((s) => s.tier === "hot").length;
    const warm = scores.filter((s) => s.tier === "warm").length;
    const cold = scores.filter((s) => s.tier === "cold").length;
    const avgScore = Math.round(
      scores.reduce((a, b) => a + b.score, 0) / (scores.length || 1)
    );

    return {
      scores,
      summary: { hot, warm, cold, avgScore },
    };
  }
}
