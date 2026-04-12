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
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function envTrim(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
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

const JSON_OUTPUT_SUFFIX =
  "\n\nReturn ONLY one JSON object (no text before or after) with keys: answer, bullet_points, supporting_sources, unanswered_questions, disclaimer. " +
  "supporting_sources must be an array of objects {label, url?, form?}.";

async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: { message?: string } };
    return j.error?.message ?? t.slice(0, 400);
  } catch {
    return t.slice(0, 400);
  }
}

async function callOpenAI(
  system: string,
  user: string,
  ticker: string,
): Promise<AskResponseBody> {
  const key = envTrim("OPENAI_API_KEY");
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
          content: user + JSON_OUTPUT_SUFFIX,
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`openai ${res.status}: ${detail}`);
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
  const key = envTrim("ANTHROPIC_API_KEY");
  if (!key) throw new Error("missing ANTHROPIC_API_KEY");

  const model =
    envTrim("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.2,
      system: system + " Output must be JSON only as specified in the user message.",
      messages: [{ role: "user", content: user + JSON_OUTPUT_SUFFIX }],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`anthropic ${res.status}: ${detail}`);
  }
  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = json.content?.map((c) => c.text).join("\n") ?? "";
  const parsed = tryParseJsonObject(text);
  if (!parsed) {
    throw new Error(
      `unparseable model output (first 200 chars): ${text.slice(0, 200).replace(/\s+/g, " ")}`,
    );
  }
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

  const openai = envTrim("OPENAI_API_KEY");
  const anthropic = envTrim("ANTHROPIC_API_KEY");

  if (!openai && !anthropic) {
    return NextResponse.json(getMockAskResponse(ticker, question));
  }

  try {
    if (openai) {
      const out = await callOpenAI(system, user, ticker);
      return NextResponse.json({
        ...out,
        disclaimer: out.disclaimer || "Research support only. Not investment advice.",
      });
    }
    const out = await callAnthropic(system, user, ticker);
    return NextResponse.json({
      ...out,
      disclaimer: out.disclaimer || "Research support only. Not investment advice.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/ask] LLM error:", msg);
    return NextResponse.json(
      {
        error: "Ask Copilot could not get a response from the language model.",
        detail: msg,
      },
      { status: 502 },
    );
  }
}
