import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { healthService } from '../services/healthService';

export const useHealthCheck = () => {
  const [isOnline, setIsOnline] = useState(healthService.isOnline());
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialCheckRef = useRef(true);
  const isOnlineRef = useRef(healthService.isOnline());
  const isCheckingRef = useRef(false);

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPolling = () => {
    if (timerRef.current) {
      return;
    }

    timerRef.current = setInterval(() => {
      checkHealth();
    }, 5000);
  };

  const setConnectionState = (online: boolean) => {
    setIsOnline(online);
    isOnlineRef.current = online;

    if (online) {
      stopPolling();
    } else {
      startPolling();
    }
  };

  const checkHealth = async () => {
    if (isCheckingRef.current) {
      return;
    }

    try {
      isCheckingRef.current = true;
      setIsChecking(true);
      const response = await api.get('/healthcheck', { timeout: 5000 });
      healthService.setSetupRequired(Boolean(response.data?.setupRequired));
      setConnectionState(true);
    } catch (error) {
      setConnectionState(false);
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const unsubscribe = healthService.subscribe((online) => {
      setConnectionState(online);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initialCheckRef.current) {
      initialCheckRef.current = false;
      checkHealth();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return { isOnline, isChecking };
};
