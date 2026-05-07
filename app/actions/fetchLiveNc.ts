'use server';

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export interface FetchLiveNcResult {
  success: boolean;
  fallbackTriggered: boolean;
  nc: string | null;
  reason?: 'timeout' | 'error' | 'invalid_input' | 'no_results' | 'parse_error';
}

interface SerperOrganicResult {
  title?: string;
  snippet?: string;
  link?: string;
}

interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
}

const SERPER_URL = 'https://google.serper.dev/search';
const GEMINI_MODEL = 'gemini-1.5-flash';
const REQUEST_TIMEOUT_MS = 6000;
const NC_TABLE_NAME = process.env.NC_TABLE_NAME || 'nc_search_index';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

function parseNcFromResponse(raw: string): string | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const candidate = (jsonMatch?.[0] ?? raw).replace(/'/g, '"');

  try {
    const parsed = JSON.parse(candidate) as { nc?: unknown };
    const nc = String(parsed.nc ?? '').trim();
    return nc || null;
  } catch {
    return null;
  }
}

export async function fetchLiveNc(university: string, program: string): Promise<FetchLiveNcResult> {
  if (!university?.trim() || !program?.trim()) {
    return { success: false, fallbackTriggered: true, nc: null, reason: 'invalid_input' };
  }

  const serperApiKey = process.env.SERPER_API_KEY;
  if (!serperApiKey) {
    return { success: false, fallbackTriggered: true, nc: null, reason: 'error' };
  }

  try {
    const query = `NC Grenzwerte ${program} ${university} aktuell`;

    const serperResponse = await withTimeout(
      fetch(SERPER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': serperApiKey,
        },
        body: JSON.stringify({
          q: query,
          gl: 'de',
          hl: 'de',
        }),
        cache: 'no-store',
      }),
      REQUEST_TIMEOUT_MS,
      'SERPER_TIMEOUT'
    );

    if (!serperResponse.ok) {
      throw new Error(`SERPER_${serperResponse.status}`);
    }

    const serperData = (await serperResponse.json()) as SerperSearchResponse;
    const organic = serperData.organic ?? [];

    if (!organic.length) {
      return { success: false, fallbackTriggered: true, nc: null, reason: 'no_results' };
    }

    const snippets = organic
      .slice(0, 8)
      .map((entry, idx) => {
        const title = entry.title?.trim() ?? '';
        const snippet = entry.snippet?.trim() ?? '';
        const link = entry.link?.trim() ?? '';
        return `Ergebnis ${idx + 1}\nTitel: ${title}\nSnippet: ${snippet}\nURL: ${link}`;
      })
      .join('\n\n');

    const prompt =
      "Hier sind Suchergebnisse. Extrahiere den aktuellsten NC-Wert (Numerus Clausus) für das Hauptverfahren. Wenn nur 'zulassungsfrei', 'Eignungsprüfung' oder ähnliches steht, antworte mit 'N/A'. Antworte NUR mit validem JSON: {'nc': ''}\n\n" +
      snippets;

    if (!GEMINI_API_KEY) {
      return { success: false, fallbackTriggered: true, nc: null, reason: 'error' };
    }
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const aiResponse = await withTimeout(
      client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      }),
      REQUEST_TIMEOUT_MS,
      'GEMINI_TIMEOUT'
    );

    const raw = aiResponse.text?.trim() ?? '';
    const nc = parseNcFromResponse(raw);

    if (!nc) {
      return { success: false, fallbackTriggered: true, nc: null, reason: 'parse_error' };
    }

    // Persist to Database (best-effort, does not block response).
    if (supabase) {
      const nowIso = new Date().toISOString();
      const { error: persistError } = await supabase
        .from(NC_TABLE_NAME)
        .update({
          nc_value: nc,
          nc_last_updated: nowIso,
        })
        .eq('university', university)
        .eq('program_name', program);

      if (persistError) {
        console.error('Failed to persist live NC result:', persistError);
      }
    } else {
      console.warn('Supabase persistence skipped: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    return { success: true, fallbackTriggered: false, nc };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const reason = message.includes('TIMEOUT') ? 'timeout' : 'error';
    return { success: false, fallbackTriggered: true, nc: null, reason };
  }
}
