import type { ReactNode } from 'react';
import styles from './styles.module.css';

export function LoyaltyApp({motion, dark = false, embedded = false, children}: { motion: string; dark?: boolean; embedded?: boolean; children: ReactNode }) {
  return <main className={`${styles.root}${embedded ? ` ${styles.embedded}` : ''} appOnly appShell ${motion}${dark ? ' dark' : ''}`} style={embedded ? {display: 'block', position: 'relative', width: '100%', height: '100%', background: dark ? 'var(--qt-color-171616)' : 'var(--qt-color-app-surface)', color: dark ? 'var(--qt-color-surface-dark-text)' : 'var(--qt-color-171717)'} : undefined}>{children}</main>;
}
