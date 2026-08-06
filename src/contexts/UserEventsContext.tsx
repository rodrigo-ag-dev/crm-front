import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { getApiBaseUrl } from '../services/api';

type EventHandler = (data: unknown) => void;

interface UserEventsContextValue {
  subscribe: (eventName: string, handler: EventHandler) => () => void;
}

const UserEventsContext = createContext<UserEventsContextValue | null>(null);

// Every server->client push aimed at the signed-in *user* (notifications, chat)
// rides one SSE connection. Opening a second EventSource against the same URL
// would just cost another of the browser's ~6 connections per host, so features
// subscribe to this shared one by event name instead of opening their own.
export const UserEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  // Event names that already have a native listener attached. Kept outside the
  // effect so a reconnect/remount can re-attach the ones subscribed so far.
  const boundEventsRef = useRef<Set<string>>(new Set());
  const bindEventRef = useRef<(eventName: string) => void>(() => {});

  useEffect(() => {
    const source = new EventSource(`${getApiBaseUrl()}/user-events/stream`, { withCredentials: true });

    const bindEvent = (eventName: string) => {
      source.addEventListener(eventName, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          console.debug(`[user-events] received ${eventName}`, data);
          handlersRef.current.get(eventName)?.forEach((handler) => handler(data));
        } catch (err) {
          console.error(`Error parsing "${eventName}" user event`, err);
        }
      });
    };

    bindEventRef.current = bindEvent;
    boundEventsRef.current.forEach(bindEvent);

    // EventSource reconnects on its own after a transient drop, and each feature
    // runs its own fallback refetch, so onerror is deliberately a no-op.
    source.onerror = () => {};

    return () => {
      source.close();
      bindEventRef.current = () => {};
    };
  }, []);

  const value = useMemo<UserEventsContextValue>(() => ({
    subscribe: (eventName, handler) => {
      let handlers = handlersRef.current.get(eventName);
      if (!handlers) {
        handlers = new Set();
        handlersRef.current.set(eventName, handlers);
      }
      handlers.add(handler);

      // One native listener per event name, however many subscribers it has.
      if (!boundEventsRef.current.has(eventName)) {
        boundEventsRef.current.add(eventName);
        bindEventRef.current(eventName);
      }

      return () => {
        handlers.delete(handler);
      };
    },
  }), []);

  return <UserEventsContext.Provider value={value}>{children}</UserEventsContext.Provider>;
};

/**
 * Subscribe to one event name on the shared per-user stream. The handler is
 * kept in a ref, so passing an inline closure doesn't resubscribe every render.
 */
export function useUserEvent<T>(eventName: string, handler: (data: T) => void) {
  const context = useContext(UserEventsContext);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!context) return;
    return context.subscribe(eventName, (data) => handlerRef.current(data as T));
  }, [context, eventName]);
}
