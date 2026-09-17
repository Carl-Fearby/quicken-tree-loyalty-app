import styles from './styles.module.css';
export function Icon({ name, className = '' }: { name: string; className?: string }) { return <i aria-hidden="true" className={`fa-solid ${name} ${styles.icon} ${className}`.trim()} />; }
