import type { AskResponseBody } from "@/lib/types";

/** Strip internal JSON / code-style field names from user-visible TickerChat copy. */
function sanitizeParagraph(s: string): string {
  let t = s;
  const reps: Array<[RegExp, string]> = [
    [/workspace_ai\.[a-z_]+/gi, "the filing excerpts in your context"],
    [/\bprimary_company\b|\bpeer_companies\b/gi, "the company data in your context"],
    [/\brisk_factors_excerpt\b/gi, "the risk factors text"],
    [/\bmdna_excerpt\b/gi, "the MD&A text"],
    [/\bgovernance_excerpt\b/gi, "the proxy text"],
    [/\bsegment_bullets\b/gi, "the segment notes"],
    [/\bsection_summaries\b/gi, "the section summaries"],
    [/\bsegment_facts\b/gi, "the segment figures"],
    [/\brevenue_series\b|\bnet_income_series\b|\boperating_expenses_series\b/gi, "the financial series"],
  ];
  for (const [re, to] of reps) t = t.replace(re, to);
  // Remove “context plumbing” phrasing — user should see what we know, not what we omitted.
  t = t.replace(/\b(referenced|mentioned)\s+but\s+not\s+(fully\s+)?excerpted\s+in\s+the\s+context\b/gi, "not included in the excerpt shown here");
  t = t.replace(/\bnot\s+fully\s+excerpted\s+in\s+the\s+context\b/gi, "not included in the excerpt shown here");
  t = t.replace(/\bthe\s+provided\s+context\s+does\s+not\s+contain\s+the\s+full\s+text\b/gi, "the excerpt shown here doesn’t include the full text");
  return t;
}

export function sanitizeTickerChatResponse(body: AskResponseBody): AskResponseBody {
  return {
    ...body,
    answer: sanitizeParagraph(body.answer),
    bullet_points: body.bullet_points.map(sanitizeParagraph),
    disclaimer: sanitizeParagraph(body.disclaimer),
    unanswered_questions: body.unanswered_questions.map(sanitizeParagraph),
  };
}
