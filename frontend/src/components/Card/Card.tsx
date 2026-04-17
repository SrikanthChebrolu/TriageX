import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?:    string;
  actions?:  ReactNode;
  children:  ReactNode;
  compact?:  boolean;
  className?: string;
}

export function Card({ title, actions, children, compact, className }: CardProps){
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      {title && (
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={compact ? styles.bodyCompact : styles.body}>
        {children}
      </div>
    </div>
  );
}
