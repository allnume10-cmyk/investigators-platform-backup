import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "./supabase";

const env = typeof import.meta !== "undefined" ? (import.meta as { env?: { VITE_GEMINI_API_KEY?: string; VITE_USE_GEMINI_PROXY?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string } }).env : undefined;
const useGeminiProxy = (): boolean => env?.VITE_USE_GEMINI_PROXY === "true";

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const u = env?.VITE_SUPABASE_URL;
  const k = env?.VITE_SUPABASE_ANON_KEY;
  if (u && k && u.startsWith("http") && k.length > 20) return { url: u.replace(/\/$/, ""), anonKey: k };
  return null;
}

async function invokeProxy<T>(action: string, payload: unknown): Promise<T> {
  const config = getSupabaseConfig();
  const body = JSON.stringify({ action, payload });

  if (config) {
    const functionUrl = `${config.url}/functions/v1/gemini-proxy`;
    try {
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.anonKey}`,
        },
        body,
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(res.ok ? "Invalid response" : `Edge Function ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        const errMsg = typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error)
        throw new Error(String((data as { error: string }).error));
      return data as T;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }
  }

  const { data, error } = await supabase.functions.invoke("gemini-proxy", { body: { action, payload } });
  if (error) {
    const err = error as { message?: string; context?: unknown };
    const msg = err.message || "Proxy request failed";
    const ctx = err.context;
    const detail =
      ctx != null
        ? typeof ctx === "object" && "message" in ctx
          ? String((ctx as { message?: string }).message)
          : String(ctx)
        : "";
    console.error("Edge Function error:", msg, ctx);
    throw new Error(detail ? `${msg} (${detail})` : msg);
  }
  if (data && typeof data === "object" && "error" in data && data.error)
    throw new Error(String((data as { error: string }).error));
  return data as T;
}

// Standard retry wrapper for API resilience
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error).toLowerCase();
      const isRateLimit = error?.status === 429 || errorStr.includes('429') || errorStr.includes('resource_exhausted') || errorStr.includes('quota');
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 3000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const safeJsonParse = (text: string, fallback: any = {}) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
};

export const generateGlobalIntelligenceBrief = async (firmData: any) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Virtual Chief of Staff Briefing for Gregory at BRENT'S INVESTIGATIVE SERVICES.
    Matters: ${firmData.activeMattersCount}, Urgent: ${firmData.urgentActionCount}, Revenue: $${firmData.totalSettlement.toLocaleString()}.
    
    Format as a strategic report.
    CRITICAL READABILITY RULE: Use markdown horizontal rules ('---') and double-line breaks between different cases or dossiers to ensure significant white space and readable separation.
    Today is ${today}.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || '';
  });
};

export const matchCommunicationToCase = async (comm: any, cases: any[]) => {
  // No cases: suggest new case without calling the API (avoids schema/empty-list edge cases)
  if (!cases || cases.length === 0) {
    return { suggestedCaseId: null, reasoning: 'No existing cases in the system.', confidence: 0 };
  }
  if (useGeminiProxy()) {
    return withRetry(() => invokeProxy("matchCommunicationToCase", { comm, cases }));
  }
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const simplifiedCases = cases.map(c => ({ id: c.id, name: `${c.defendantLastName}, ${c.defendantFirstName}`, number: c.caseNumber || '' }));
    const bodySnippet = (comm.body || '').slice(0, 2000);
    const prompt = `You are matching an email to an existing case dossier. If the email clearly refers to a defendant name or case number (e.g. REF 2024-004) that matches a dossier, return that dossier's id. Otherwise return empty string for suggestedCaseId (new case).

In your reasoning, always refer to dossiers by defendant name and case number (e.g. "Wilson, James — REF 2024-001"). Do not use or mention dossier ids in the reasoning text. If multiple dossiers share the same defendant name, list each as "LastName, FirstName — REF number".

Email subject: ${comm.subject || ''}
Email body (excerpt): ${bodySnippet}

Dossiers (id, name, number): ${JSON.stringify(simplifiedCases)}

Respond with JSON only: suggestedCaseId (string; use dossier id or "" for new case), reasoning (string; use name and case number only, no ids), confidence (number 0-1).`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCaseId: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          }
        }
      }
    });
    const raw = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = safeJsonParse(raw, null);
    if (parsed && typeof parsed.suggestedCaseId === 'string' && parsed.suggestedCaseId.trim() === '') {
      parsed.suggestedCaseId = null;
    }
    return parsed;
  });
};

export const summarizeCommForLog = async (comm: any) => {
  if (useGeminiProxy()) {
    return withRetry(() => invokeProxy("summarizeCommForLog", { comm }));
  }
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize in professional investigative PAST TENSE: ${comm.body}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            hours: { type: Type.NUMBER },
            code: { type: Type.STRING }
          }
        }
      }
    });
    return safeJsonParse(response.text || '{}', null);
  });
};

export const processAudioToActivity = async (base64Audio: string, mimeType: string, activityCodes: { code: string, label: string }[]) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType: mimeType } },
          { text: `Extract activity. Rewrite summary in formal PAST TENSE. Codes: ${activityCodes.map(c => c.code).join(', ')}` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hours: { type: Type.NUMBER },
            code: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });
    return safeJsonParse(response.text || '{}', null);
  });
};

export const parseEmailToCase = async (emailText: string, senderEmail: string) => {
  if (useGeminiProxy()) {
    return withRetry(() => invokeProxy("parseEmailToCase", { emailText, senderEmail }));
  }
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Extract intake from this email. Be precise about who is who.
- defendant_first and defendant_last: the DEFENDANT or CLIENT (the person the case is about). Example: "Linda Garcia" → defendant_first: Linda, defendant_last: Garcia.
- lead_counsel: the ATTORNEY or LAWYER (counsel for the defendant). Often the email sender. Do NOT put the defendant name here.
- case_number: any REF or case ID mentioned.
Email body: ${emailText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            defendant_first: { type: Type.STRING },
            defendant_last: { type: Type.STRING },
            case_number: { type: Type.STRING },
            lead_counsel: { type: Type.STRING },
            judge: { type: Type.STRING },
            next_court_date: { type: Type.STRING },
            hearing_type: { type: Type.STRING },
            directives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  context: { type: Type.STRING },
                  suggested_priority: { type: Type.STRING }
                }
              }
            },
            confidence_score: { type: Type.NUMBER }
          }
        }
      }
    });
    return safeJsonParse(response.text || '{}', {});
  });
};

export const parseBulkSpreadsheet = async (rawText: string) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `CSV Parse: ${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              caseNumber: { type: Type.STRING },
              defendantFirstName: { type: Type.STRING },
              defendantLastName: { type: Type.STRING },
              nextCourtDate: { type: Type.STRING }
            }
          }
        }
      }
    });
    return safeJsonParse(response.text || '[]', []);
  });
};

export const draftInvestigativeEmail = async (requestType: string, caseContext: any) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Draft professional investigative update for ${caseContext.caseNumber}. Type: ${requestType}. End with: Andrea, BRENT'S INVESTIGATE SERVICES, LLC` });
    return response.text || '';
  });
};

export const generateAttorneyReport = async (reportType: string, attorneyName: string | null, data: any) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: env?.VITE_GEMINI_API_KEY ?? "" });
    const greetingName = attorneyName || "Counsel";

    let instruction = "";
    if (reportType === 'weekly') {
      instruction = `
        Generate a Weekly Status Report for BRENT'S INVESTIGATIVE SERVICES, LLC.
        Strictly follow this template:
        "Hello Attorney ${greetingName},
        This is your weekly snapshot of active investigative matters.
        ### Upcoming Court dates (next 7 days)
        ### Cases with Missing Vouchers (Assigned 10+ days)
        #### Missing Voucher on Closed Cases
        ### Detailed Activity of Remaining Active Cases
        Sign as Andrea, BRENT'S INVESTIGATE SERVICES, LLC"
      `;
    } else if (reportType === 'aged') {
      instruction = `
        INVESTIGATIVE AGED VOUCHER AUDIT
        
        Section #1 Heading must be exactly:
        "The following cases have been assigned to us for over 90 days without voucher submission. These require your immediate attention."
        
        List cases with assigned dates > 90 days first. Then list 60-day and 30-day brackets.
        Format professionally for attorney ${greetingName}.
        Sign: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.
      `;
    } else if (reportType === 'aging') {
      instruction = `
        CASE AGING & VELOCITY REPORT
        Analyze the duration of dossiers from their 'dateOpened' field.
        Show ${greetingName} how long cases have been in the investigative pipeline.
        Categorize by age: New (0-30 days), Seasoned (31-90 days), and Legacy (91+ days).
        Sign: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.
      `;
    } else if (reportType === 'stagnant') {
      instruction = `
        STAGNANT ADVISORY
        Identify dossiers with zero activity logs in the last 45 days.
        Provide ${greetingName} with a 'Risk Registry' of matters that have stalled.
        Suggest the next logical investigative step for each stagnant matter.
        Sign: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.
      `;
    } else if (reportType === 'pretrial') {
      instruction = `
        PRE-TRIAL READINESS AUDIT
        Summarize the readiness state for all cases with 'Trial Readiness' or 'Jury Trial' listed in their next event description.
        Provide ${greetingName} with a checklist of completed vs pending investigative tasks for these critical matters.
        Sign: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.
      `;
    } else if (reportType === 'intel') {
      instruction = `
        Virtual Chief of Staff Briefing.
        Focus on operational velocity and risk registry.
        CRITICAL READABILITY RULE: Use horizontal rules (---) between every case dossier to ensure significant white space.
        Sign: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.
      `;
    } else {
      instruction = `Generate a strategic ${reportType} report for attorney ${greetingName}. Ensure all work descriptions are in the PAST TENSE. End with signature: Andrea, BRENT'S INVESTIGATE SERVICES, LLC.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${instruction}\n\nData Context: ${JSON.stringify(data)}`
    });
    return response.text || '';
  });
};
