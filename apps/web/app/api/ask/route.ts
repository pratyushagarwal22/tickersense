import { buildAskSystemPrompt, buildAskUserPrompt } from "@/lib/prompts";
import { getMockAskResponse } from "@/lib/mock-data";
import type { AskResponseBody } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  ticker: z.string().min(1),
  question: z.string().min(1),
  companyContext: z.any().optional().nullable(),
});

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeAskResponse(parsed: Record<string, unknown>, ticker: string): AskResponseBody {
  const disclaimer =
    typeof parsed.disclaimer === "string" && parsed.disclaimer.trim()
      ? parsed.disclaimer
      : "Research support only. Not investment advice.";

  const bullet_points = Array.isArray(parsed.bullet_points)
    ? parsed.bullet_points.map(String)
    : [];

  const supporting_sources = Array.isArray(parsed.supporting_sources)
    ? parsed.supporting_sources.map((s) => {
        const o = s as Record<string, unknown>;
        return {
          label: String(o.label ?? "Source"),
          url: typeof o.url === "string" ? o.url : undefined,
          form: typeof o.form === "string" ? o.form : undefined,
        };
      })
    : [];

  const unanswered_questions = Array.isArray(parsed.unanswered_questions)
    ? parsed.unanswered_questions.map(String)
    : [];

  return {
    answer: typeof parsed.answer === "string" ? parsed.answer : `Research notes for ${ticker}.`,
    bullet_points,
    supporting_sources,
    unanswered_questions,
    disclaimer,
  };
}

async function callOpenAI(
  system: string,
  user: string,
  ticker: string,
): Promise<AskResponseBody> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            user +
            "\n\nReturn ONLY valid JSON with keys: answer, bullet_points, supporting_sources, unanswered_questions, disclaimer.\n" +
            "supporting_sources items should be objects: {label, url?, form?}.",
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`openai ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const parsed = tryParseJsonObject(text);
  if (!parsed) throw new Error("unparseable model output");
  return normalizeAskResponse(parsed, ticker);
}

async function callAnthropic(
  system: string,
  user: string,
  ticker: string,
): Promise<AskResponseBody> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1200,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = json.content?.map((c) => c.text).join("\n") ?? "";
  const parsed = tryParseJsonObject(text);
  if (!parsed) throw new Error("unparseable model output");
  return normalizeAskResponse(parsed, ticker);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { ticker, question, companyContext } = parsedBody.data;
  const system = buildAskSystemPrompt();
  const user = buildAskUserPrompt({ ticker, question, companyContext });

  try {
    if (process.env.OPENAI_API_KEY) {
      const out = await callOpenAI(system, user, ticker);
      return NextResponse.json({ ...out, disclaimer: out.disclaimer || "Research support only. Not investment advice." });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      const out = await callAnthropic(system, user, ticker);
      return NextResponse.json({ ...out, disclaimer: out.disclaimer || "Research support only. Not investment advice." });
    }
  } catch {
    // fall through to mock
  }

  return NextResponse.json(getMockAskResponse(ticker, question));
}
