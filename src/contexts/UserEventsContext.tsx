import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { getApiBaseUrl, getAuthToken } from '../services/api';

type EventHandler = (data: unknown) => void;

interface UserEventsContextValue {
  subscribe: (eventName: string, handler: EventHandler) => () => void;
}

const UserEventsContext = createContext<UserEventsContextValue | null>(null);

export const UserEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  // Event names that already have a native listener attached. Kept outside the
  // effect so a reconnect/remount can re-attach the ones subscribed so far.
  const boundEventsRef = useRef<Set<string>>(new Set());
  const bindEventRef = useRef<(eventName: string) => void>(() => {});

  useEffect(() => {
    const token = getAuthToken();
    const url = token
      ? `${getApiBaseUrl()}/user-events/stream?token=${encodeURIComponent(token)}`
      : `${getApiBaseUrl()}/user-events/stream`;

    const source = new EventSource(url, { withCredentials: true });

    const bindEvent = (eventName: string) => {
      source.addEventListener(eventName, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
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
