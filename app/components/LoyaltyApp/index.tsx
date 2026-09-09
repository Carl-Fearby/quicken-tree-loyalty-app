import type { ReactNode } from 'react';
import styles from './styles.module.css';

export function LoyaltyApp({motion, dark = false, children}: { motion: string; dark?: boolean; children: ReactNode }) {
  return <main className={`${styles.root} appOnly appShell ${motion}${dark ? ' dark' : ''}`}>{children}</main>;
}
