import type { ReactNode } from 'react';
import styles from './styles.module.css';

export function LoyaltyApp({motion, dark = false, embedded = false, children}: { motion: string; dark?: boolean; embedded?: boolean; children: ReactNode }) {
  return <main className={`${styles.root}${embedded ? ` ${styles.embedded}` : ''} appOnly appShell ${motion}${dark ? ' dark' : ''}`} style={embedded ? {display: 'block', position: 'relative', width: '100%', height: '100%', background: dark ? 'var(--qt-color-surface-dark)' : 'var(--qt-color-app-surface)', color: dark ? 'var(--qt-color-surface-dark-text)' : 'var(--qt-color-app-ink)'} : undefined}>{children}</main>;
}
