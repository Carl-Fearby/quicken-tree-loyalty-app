import type { ReactNode } from 'react';
import styles from './styles.module.css';

export function IphoneWrapper({ preview, children }: { preview: boolean; children: ReactNode }) {
  return <section className={`${styles.root} phone${preview ? '' : ' standalone'}`} aria-label="The Quicken Tree loyalty app">{children}</section>;
}
