import { useEventStream } from './useEventStream';

interface UseTicketCommentsStreamOptions<T> {
  /** Full stream URL, or null/undefined to stay disabled (e.g. no ticketId yet). */
  url: string | null | undefined;
  onComment: (comment: T) => void;
  /** Called when the server tells us to stop (e.g. a public share link got revoked mid-connection). */
  onRevoked?: () => void;
  /** Safety-net poll, run on a much longer interval than the old 5s poll this replaces. */
  fallbackPoll: () => void;
  fallbackIntervalMs?: number;
}

// Backs both TicketTimeline.tsx (agent view) and PublicTicketChat.tsx (public
// share-link view) - they hit different endpoints/payload shapes, but both
// just need "call me when a new comment shows up on this ticket" instead of
// re-fetching the whole comment list every few seconds. Thin wrapper over
// useEventStream, which the notification bell shares.
export function useTicketCommentsStream<T>({
  url,
  onComment,
  onRevoked,
  fallbackPoll,
  fallbackIntervalMs,
}: UseTicketCommentsStreamOptions<T>) {
  useEventStream<T>({
    url,
    eventName: 'comment',
    onEvent: onComment,
    onRevoked,
    fallbackPoll,
    fallbackIntervalMs,
  });
}
