import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { maintenanceWindowService, type MaintenanceAnnouncement } from '../services/maintenanceWindowService';
import { toFormatedDateTime } from '../utils/dateUtils';
import styles from './MaintenanceBanner.module.css';

const POLL_INTERVAL_MS = 60000;

interface BannerState {
  announcement: MaintenanceAnnouncement;
  isOngoing: boolean;
}

export const MaintenanceBanner: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<BannerState | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        const response = await maintenanceWindowService.getAnnouncement();
        const announcement = response.data;
        setState(
          announcement?.active
            ? { announcement, isOngoing: new Date(announcement.startsAt).getTime() <= Date.now() }
            : null,
        );
      } catch {
        setState(null);
      } finally {
        isCheckingRef.current = false;
      }
    };

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!state) {
    return null;
  }

  const { announcement, isOngoing } = state;
  const text = isOngoing
    ? t('maintenanceBanner.ongoing', { date: toFormatedDateTime(announcement.endsAt) })
    : t('maintenanceBanner.upcoming', { date: toFormatedDateTime(announcement.startsAt) });

  return (
    <div className={styles.banner} role="alert">
      <AlertTriangle size={16} className={styles.icon} />
      <span>{text}</span>
      {announcement.message && <span className={styles.separator}>—</span>}
      {announcement.message && <span className={styles.message}>{announcement.message}</span>}
    </div>
  );
};
