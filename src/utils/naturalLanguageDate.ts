export type QuickAddLocale = 'pt-BR' | 'en-US' | 'es-ES';

export interface ParsedQuickAdd {
  title: string;
  dueAt?: string;
}

// Longest phrases must be checked first so "depois de amanhã" matches before
// the shorter "amanhã" contained within it does.
const RELATIVE_DAYS: Record<QuickAddLocale, Record<string, number>> = {
  'pt-BR': { 'depois de amanhã': 2, 'depois de amanha': 2, 'hoje': 0, 'amanhã': 1, 'amanha': 1 },
  'en-US': { 'day after tomorrow': 2, 'today': 0, 'tomorrow': 1 },
  'es-ES': { 'pasado mañana': 2, 'pasado manana': 2, 'hoy': 0, 'mañana': 1, 'manana': 1 },
};

const IN_DAYS_PATTERN: Record<QuickAddLocale, RegExp> = {
  'pt-BR': /\b(?:em|daqui a)\s+(\d+)\s+dias?\b/i,
  'en-US': /\bin\s+(\d+)\s+days?\b/i,
  'es-ES': /\ben\s+(\d+)\s+d[ií]as?\b/i,
};

// Index 0 = Sunday, matching Date.prototype.getDay().
const WEEKDAYS: Record<QuickAddLocale, string[]> = {
  'pt-BR': ['domingo', 'segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado'],
  'en-US': ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  'es-ES': ['domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado'],
};

// Maps each entry in WEEKDAYS above to its day-of-week index (0-6); pt-BR/es-ES
// list a couple of accented/unaccented spellings for the same day.
const WEEKDAY_INDEX: Record<QuickAddLocale, number[]> = {
  'pt-BR': [0, 1, 2, 2, 3, 4, 5, 6, 6],
  'en-US': [0, 1, 2, 3, 4, 5, 6],
  'es-ES': [0, 1, 2, 3, 3, 4, 5, 6, 6],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function nextWeekday(targetDow: number): Date {
  const now = new Date();
  const diff = (targetDow - now.getDay() + 7) % 7 || 7;
  return addDays(now, diff);
}

// Optional connector word immediately before a time (e.g. "às 15h", "at 3pm",
// "a las 15h") is captured as part of the match so it gets stripped from the
// title along with the time itself, instead of being left dangling. Each is
// only consumed when directly followed by a recognized time pattern, so plain
// uses of "as"/"at"/"a" elsewhere in a sentence are never affected.
const TIME_CONNECTOR: Record<QuickAddLocale, string> = {
  'pt-BR': '(?:\\b(?:às|as)\\s+)?',
  'en-US': '(?:\\bat\\s+)?',
  'es-ES': '(?:\\ba\\s+las\\s+|\\ba\\s+)?',
};

function parseTime(text: string, locale: QuickAddLocale): { hours: number; minutes: number; match: string } | null {
  const connector = TIME_CONNECTOR[locale];

  const hMatch = text.match(new RegExp(`${connector}\\b(\\d{1,2})h(\\d{2})?\\b`, 'i'));
  if (hMatch) {
    return { hours: parseInt(hMatch[1], 10), minutes: hMatch[2] ? parseInt(hMatch[2], 10) : 0, match: hMatch[0] };
  }

  const colonMatch = text.match(new RegExp(`${connector}\\b(\\d{1,2}):(\\d{2})\\b`, 'i'));
  if (colonMatch) {
    return { hours: parseInt(colonMatch[1], 10), minutes: parseInt(colonMatch[2], 10), match: colonMatch[0] };
  }

  const amPmMatch = text.match(new RegExp(`${connector}\\b(\\d{1,2})\\s?(am|pm)\\b`, 'i'));
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10) % 12;
    if (amPmMatch[2].toLowerCase() === 'pm') hours += 12;
    return { hours, minutes: 0, match: amPmMatch[0] };
  }

  return null;
}

/**
 * Extracts a relative date/time expression from free-form quick-add text and
 * strips it from the returned title, so "Ligar amanhã 15h" -> { title: "Ligar",
 * dueAt: <tomorrow at 15:00> }. Supports pt-BR, en-US and es-ES phrasing so the
 * quick-capture bar isn't Portuguese-only.
 */
export function parseQuickAddText(rawText: string, locale: QuickAddLocale): ParsedQuickAdd {
  let text = rawText;
  let targetDate: Date | null = null;

  const relativePhrases = Object.keys(RELATIVE_DAYS[locale]).sort((a, b) => b.length - a.length);
  for (const phrase of relativePhrases) {
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i');
    const match = text.match(re);
    if (match) {
      targetDate = addDays(new Date(), RELATIVE_DAYS[locale][phrase]);
      text = text.replace(re, '').trim();
      break;
    }
  }

  if (!targetDate) {
    const match = text.match(IN_DAYS_PATTERN[locale]);
    if (match) {
      targetDate = addDays(new Date(), parseInt(match[1], 10));
      text = text.replace(match[0], '').trim();
    }
  }

  if (!targetDate) {
    const weekdays = WEEKDAYS[locale];
    for (let i = 0; i < weekdays.length; i++) {
      const re = new RegExp(`\\b${escapeRegExp(weekdays[i])}(?:-feira)?\\b`, 'i');
      const match = text.match(re);
      if (match) {
        targetDate = nextWeekday(WEEKDAY_INDEX[locale][i]);
        text = text.replace(match[0], '').trim();
        break;
      }
    }
  }

  const time = parseTime(text, locale);
  if (time) {
    text = text.replace(time.match, '').trim();
  }

  if (targetDate) {
    targetDate.setHours(time ? time.hours : 9, time ? time.minutes : 0, 0, 0);
  } else if (time) {
    const candidate = new Date();
    candidate.setHours(time.hours, time.minutes, 0, 0);
    if (candidate < new Date()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    targetDate = candidate;
  }

  text = text.replace(/\s{2,}/g, ' ').trim();

  return { title: text, dueAt: targetDate ? targetDate.toISOString() : undefined };
}
