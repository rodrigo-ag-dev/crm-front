import type { CSSProperties } from 'react';

export const getInitials = (text: string): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const getAvatarStyle = (text: string): CSSProperties => {
  const initials = getInitials(text);
  if (!initials) return {};
  let hash = 0;
  for (let i = 0; i < initials.length; i += 1) {
    hash = (hash * 1315423911) ^ initials.charCodeAt(i);
  }

  const hue = hash % 360;
  const saturation = 50 + (hash % 20);
  const lightness = 38 + (hash % 18);

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    color: '#FFFFFF',
  };
};
