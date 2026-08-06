import { useEffect, useRef } from 'react';

interface UseEventStreamOptions<T> {
  /** Full stream URL, or null/undefined to stay disabled (e.g. no ticketId yet). */
  url: string | null | undefined;
  /** SSE event name the backend writes (`event: <name>`). */
  eventName: string;
  onEvent: (data: T) => void;
  /** Called when the server tells us to stop (e.g. a public share link got revoked mid-connection). */
  onRevoked?: () => void;
  /** Safety-net poll, run on a much longer interval than the polls these streams replace. */
  fallbackPoll: () => void;
  fallbackIntervalMs?: number;
}

const DEFAULT_FALLBACK_INTERVAL_MS = 60000;

// Generic Server-Sent Events subscription: opens an EventSource against a
// backend stream endpoint and hands each parsed payload to onEvent. Backs the
// ticket comment streams (see useTicketCommentsStream) and the topbar
// notification bell.
//
// `withCredentials: true` is what makes this work with zero extra plumbing - it
// sends the existing crm_token cookie exactly like a normal axios request,
// since EventSource can't set custom headers at all.
export function useEventStream<T>({
  url,
  eventName,
  onEvent,
  onRevoked,
  fallbackPoll,
  fallbackIntervalMs = DEFAULT_FALLBACK_INTERVAL_MS,
}: UseEventStreamOptions<T>) {
  const onEventRef = useRef(onEvent);
  const onRevokedRef = useRef(onRevoked);
  const fallbackPollRef = useRef(fallbackPoll);

  // Kept in refs so the subscription below only depends on the URL - callers
  // pass inline closures that change identity every render, and reopening the
  // EventSource that often would defeat the point. Synced in an effect rather
  // than during render (the react-hooks/refs lint rule forbids the latter).
  useEffect(() => {
    onEventRef.current = onEvent;
    onRevokedRef.current = onRevoked;
    fallbackPollRef.current = fallbackPoll;
  });

  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener(eventName, (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as T;
        onEventRef.current(data);
      } catch (err) {
        console.error(`Error parsing "${eventName}" stream event`, err);
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
  }, [url, eventName, fallbackIntervalMs]);
}
