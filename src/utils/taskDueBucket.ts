export type TaskDueBucket = 'overdue' | 'today' | 'future';

export function getTaskDueBucket(dueAt?: string): TaskDueBucket | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (due < startOfToday) return 'overdue';
  if (due < startOfTomorrow) return 'today';
  return 'future';
}
