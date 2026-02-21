// Supabase Edge Function: Gemini API proxy (keeps API key server-side)
// Deploy: supabase functions deploy gemini-proxy --no-verify-jwt
// Set secret: supabase secrets set GEMINI_API_KEY=your_key

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY secret is not set");
  return key;
}

async function callGemini(
  model: string,
  prompt: string,
  options: { responseMimeType?: string; responseSchema?: object } = {}
): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (options.responseMimeType || options.responseSchema) {
    body.generationConfig = {
      responseMimeType: options.responseMimeType ?? "application/json",
      responseSchema: options.responseSchema ?? undefined,
    };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// --- Actions (same logic as geminiService, but server-side) ---

async function matchCommunicationToCase(payload: {
  comm: { subject?: string; body?: string };
  cases: Array<{ id: string; defendantLastName: string; defendantFirstName: string; caseNumber?: string }>;
}): Promise<object> {
  const { comm, cases } = payload;
  if (!cases?.length) {
    return { suggestedCaseId: null, reasoning: "No existing cases in the system.", confidence: 0 };
  }
  const simplifiedCases = cases.map((c) => ({
    id: c.id,
    name: `${c.defendantLastName}, ${c.defendantFirstName}`,
    number: c.caseNumber || "",
  }));
  const bodySnippet = (comm.body || "").slice(0, 2000);
  const prompt = `You are matching an email to an existing case dossier. If the email clearly refers to a defendant name or case number (e.g. REF 2024-004) that matches a dossier, return that dossier's id. Otherwise return empty string for suggestedCaseId (new case).

In your reasoning, always refer to dossiers by defendant name and case number (e.g. "Wilson, James — REF 2024-001"). Do not use or mention dossier ids in the reasoning text. If multiple dossiers share the same defendant name, list each as "LastName, FirstName — REF number".

Email subject: ${comm.subject || ""}
Email body (excerpt): ${bodySnippet}

Dossiers (id, name, number): ${JSON.stringify(simplifiedCases)}

Respond with JSON only: suggestedCaseId (string; use dossier id or "" for new case), reasoning (string; use name and case number only, no ids), confidence (number 0-1).`;
  const responseSchema = {
    type: "object",
    properties: {
      suggestedCaseId: { type: "string" },
      reasoning: { type: "string" },
      confidence: { type: "number" },
    },
  };
  const raw = await callGemini("gemini-2.5-flash", prompt, {
    responseMimeType: "application/json",
    responseSchema,
  });
  const parsed = safeJsonParse<{ suggestedCaseId?: string; reasoning?: string; confidence?: number }>(raw, {});
  if (parsed && typeof parsed.suggestedCaseId === "string" && parsed.suggestedCaseId.trim() === "") {
    parsed.suggestedCaseId = null as unknown as string;
  }
  return parsed;
}

async function summarizeCommForLog(payload: { comm: { body?: string } }): Promise<object> {
  const prompt = `Summarize in professional investigative PAST TENSE: ${payload.comm?.body ?? ""}`;
  const responseSchema = {
    type: "object",
    properties: {
      narrative: { type: "string" },
      hours: { type: "number" },
      code: { type: "string" },
    },
  };
  const raw = await callGemini("gemini-2.5-flash", prompt, {
    responseMimeType: "application/json",
    responseSchema,
  });
  return safeJsonParse(raw, {});
}

async function parseEmailToCase(payload: { emailText: string; senderEmail: string }): Promise<object> {
  const prompt = `Extract intake from this email. Be precise about who is who.
- defendant_first and defendant_last: the DEFENDANT or CLIENT (the person the case is about). Example: "Linda Garcia" or "review for Linda Garcia" → defendant_first: Linda, defendant_last: Garcia.
- lead_counsel: the ATTORNEY or LAWYER (counsel representing the defendant). Often the email sender or someone signed as counsel. Do NOT put the defendant name here.
- case_number: any reference number, REF, or case ID mentioned.
Email sender (often the attorney): ${payload.senderEmail}

Email body:
${payload.emailText}`;
  const responseSchema = {
    type: "object",
    properties: {
      defendant_first: { type: "string" },
      defendant_last: { type: "string" },
      case_number: { type: "string" },
      lead_counsel: { type: "string" },
      judge: { type: "string" },
      next_court_date: { type: "string" },
      hearing_type: { type: "string" },
      directives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            task: { type: "string" },
            context: { type: "string" },
            suggested_priority: { type: "string" },
          },
        },
      },
      confidence_score: { type: "number" },
    },
  };
  const raw = await callGemini("gemini-2.5-flash", prompt, {
    responseMimeType: "application/json",
    responseSchema,
  });
  return safeJsonParse(raw, {});
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, apikey",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
  let body: { action: string; payload: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
  const { action, payload } = body;
  if (!action || payload === undefined) {
    return new Response(JSON.stringify({ error: "Missing action or payload" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
  const cors = { ...CORS_HEADERS, "Content-Type": "application/json" };
  try {
    let result: unknown;
    switch (action) {
      case "matchCommunicationToCase":
        result = await matchCommunicationToCase(payload as { comm: { subject?: string; body?: string }; cases: Array<{ id: string; defendantLastName: string; defendantFirstName: string; caseNumber?: string }> });
        break;
      case "summarizeCommForLog":
        result = await summarizeCommForLog(payload as { comm: { body?: string } });
        break;
      case "parseEmailToCase":
        result = await parseEmailToCase(payload as { emailText: string; senderEmail: string });
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify(result), { status: 200, headers: cors });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: cors });
  }
});
