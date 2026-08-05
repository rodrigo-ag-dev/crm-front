import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonBarProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBar: React.FC<SkeletonBarProps> = ({ width = '100%', height = 12, radius = 4, className, style }) => (
  <span
    className={`${styles.bar}${className ? ` ${className}` : ''}`}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

interface SkeletonTableRowsProps {
  columns: number;
  rows?: number;
}

export const SkeletonTableRows: React.FC<SkeletonTableRowsProps> = ({ columns, rows = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: columns }).map((_, c) => (
          <td key={c}>
            <SkeletonBar width={c === 0 ? '70%' : '85%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
