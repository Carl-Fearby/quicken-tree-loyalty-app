import styles from './styles.module.css';
export function Header({ title }: { title: string }) { return <div className={`sectionTitle ${styles.root}`}>{title}</div>; }
