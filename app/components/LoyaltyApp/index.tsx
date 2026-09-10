import type { ReactNode } from 'react';
import styles from './styles.module.css';

export function LoyaltyApp({motion, dark = false, embedded = false, children}: { motion: string; dark?: boolean; embedded?: boolean; children: ReactNode }) {
  return <main className={`${styles.root}${embedded ? ` ${styles.embedded}` : ''} appOnly appShell ${motion}${dark ? ' dark' : ''}`} style={embedded ? {display: 'block', position: 'relative', width: '100%', height: '100%', background: dark ? '#171616' : '#fafafa', color: dark ? '#f7f3ee' : '#171717'} : undefined}>{children}</main>;
}
