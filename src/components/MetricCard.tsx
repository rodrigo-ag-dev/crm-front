import React from 'react';
import { ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  icon: React.ElementType;
  colorVar: string;
  label: string;
  value: string;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, colorVar, label, value, loading, href, onClick, active }) => (
  <div
    className={`card ${styles.card}${onClick ? ` ${styles.clickable}` : ''}${active ? ` ${styles.active}` : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className={styles.bar} style={{ background: `var(${colorVar})` }} />
    <div className={styles.body}>
      <div className={styles.iconWrap} style={{ color: `var(${colorVar})`, background: `color-mix(in srgb, var(${colorVar}) 12%, transparent)` }}>
        <Icon size={22} />
      </div>
      <div className={styles.info}>
        <p className={styles.label}>{label}</p>
        {loading ? <div className={styles.skeleton} /> : <h2 className={styles.value}>{value}</h2>}
      </div>
    </div>
    {href && (
      <NavLink to={href} className={styles.link}>
        <ArrowRight size={14} />
      </NavLink>
    )}
  </div>
);
