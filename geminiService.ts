import { GoogleGenAI, Type } from "@google/genai";

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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const simplifiedCases = cases.map(c => ({ id: c.id, name: `${c.defendantLastName}, ${c.defendantFirstName} `, number: c.caseNumber }));
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Match: ${comm.subject}. Dossiers: ${JSON.stringify(simplifiedCases)}`,
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
    return safeJsonParse(response.text || '{}', null);
  });
};

export const summarizeCommForLog = async (comm: any) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Extract intake from: ${emailText}`,
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Draft professional investigative update for ${caseContext.caseNumber}. Type: ${requestType}. End with: Andrea, BRENT'S INVESTIGATE SERVICES, LLC` });
    return response.text || '';
  });
};

export const generateAttorneyReport = async (reportType: string, attorneyName: string | null, data: any) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
