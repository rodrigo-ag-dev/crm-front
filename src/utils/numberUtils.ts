export function abbreviateNumber(
  value: number | string | null | undefined,
  decimals = 2
): string {
  let locale = localStorage.getItem('@CRM:language') || navigator.language || 'pt-BR';
  if (value === null || value === undefined) return '';

  const parseNumber = (v: number | string): number => {
    if (typeof v === 'number') return v;
    const s = String(v).trim();

    const hasDot = s.indexOf('.') !== -1;
    const hasComma = s.indexOf(',') !== -1;
    if (hasDot && hasComma) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        return Number(s.replace(/\./g, '').replace(',', '.'));
      } else {
        return Number(s.replace(/,/g, ''));
      }
    }

    if (hasComma && !hasDot) {
      return Number(s.replace(',', '.'));
    }

    return Number(s);
  };

  const num = parseNumber(value);
  if (!isFinite(num)) return '';

  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  const tiers: { value: number; suffix: string }[] = [
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ];

  let currencySymbol = '';
  switch (locale) {
    case 'pt-BR':
      currencySymbol = 'R$ ';
      break;
    case 'en-US':
      currencySymbol = '$ ';
      break;
    case 'es-ES':
      currencySymbol = '£ ';
      break;
    default:
      currencySymbol = '';
  }

  for (const tier of tiers) {
    if (abs >= tier.value) {
      const short = abs / tier.value;
      const formatted = short.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: false,
      });
      return `${currencySymbol}${sign}${formatted}${tier.suffix}`;
    }
  }

  return `${currencySymbol}${sign}${abs.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}