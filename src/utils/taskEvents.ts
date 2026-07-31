const TASK_CHANGED_EVENT = 'crm:task-changed';

// Tasks can be created/updated from several disconnected places at once (the
// global quick-add bar, the per-entity TaskWidget, the notification bell) -
// this lets whichever task views are mounted (Meu Dia's Kanban) know to refetch
// without wiring props/context through all of them.
export function emitTaskChanged() {
  window.dispatchEvent(new CustomEvent(TASK_CHANGED_EVENT));
}

export function subscribeTaskChanged(handler: () => void): () => void {
  window.addEventListener(TASK_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TASK_CHANGED_EVENT, handler);
}
