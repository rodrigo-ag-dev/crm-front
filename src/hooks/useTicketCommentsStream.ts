import { useEffect, useRef } from 'react';

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

const DEFAULT_FALLBACK_INTERVAL_MS = 60000;

// Backs both TicketTimeline.tsx (agent view) and PublicTicketChat.tsx (public
// share-link view) - they hit different endpoints/payload shapes, but both
// just need "call me when a new comment shows up on this ticket" instead of
// re-fetching the whole comment list every few seconds.
export function useTicketCommentsStream<T>({
  url,
  onComment,
  onRevoked,
  fallbackPoll,
  fallbackIntervalMs = DEFAULT_FALLBACK_INTERVAL_MS,
}: UseTicketCommentsStreamOptions<T>) {
  const onCommentRef = useRef(onComment);
  onCommentRef.current = onComment;
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;
  const fallbackPollRef = useRef(fallbackPoll);
  fallbackPollRef.current = fallbackPoll;

  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener('comment', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as T;
        onCommentRef.current(data);
      } catch (err) {
        console.error('Error parsing ticket comment stream event', err);
      }
    });

    source.addEventListener('revoked', () => {
      source.close();
      onRevokedRef.current?.();
    });

    // EventSource reconnects on its own after a transient drop - nothing to
    // do here. The fallback poll below is only for the case where that
    // reconnection silently stalls (e.g. a backgrounded tab, a proxy that
    // swallows the connection without an error event).
    source.onerror = () => {};

    const fallbackIntervalId = setInterval(() => fallbackPollRef.current(), fallbackIntervalMs);

    return () => {
      source.close();
      clearInterval(fallbackIntervalId);
    };
  }, [url, fallbackIntervalMs]);
}
