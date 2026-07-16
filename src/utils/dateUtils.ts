export function toFormatedDate(value: number | string | null | undefined): string {
  let locale = localStorage.getItem('@CRM:language') || navigator.language || 'pt-BR';
  if (value === null || value === undefined) return '-';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale);
}