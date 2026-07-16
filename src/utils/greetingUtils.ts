export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

type GreetingPeriod = 'morning' | 'afternoon' | 'night';

const GREETINGS: Record<SupportedLanguage, Record<GreetingPeriod, string>> = {
  'pt-BR': {
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    night: 'Boa noite',
  },
  'en-US': {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    night: 'Good evening',
  },
  'es-ES': {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    night: 'Buenas noches',
  },
};

export function getGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }

  return 'night';
}

export function getTimeGreeting(
  language: SupportedLanguage = 'pt-BR',
  date: Date = new Date()
): string {
  const period = getGreetingPeriod(date);
  return GREETINGS[language]?.[period] ?? GREETINGS['pt-BR'][period];
}
