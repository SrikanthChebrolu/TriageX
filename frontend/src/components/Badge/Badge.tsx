import styles from './Badge.module.css';
import type { Severity, PriorityBand, ConfidenceBand } from '../../types';

interface SeverityBadgeProps { severity: Severity }
interface PriorityBadgeProps { band: PriorityBand }
interface ConfidenceBadgeProps { band: ConfidenceBand }

const severityClass: Record<Severity, string> = {
  CRITICAL: styles.severityCritical,
  HIGH:     styles.severityHigh,
  MEDIUM:   styles.severityMedium,
  LOW:      styles.severityLow,
};

const priorityClass: Record<PriorityBand, string> = {
  P1: styles.priorityP1,
  P2: styles.priorityP2,
  P3: styles.priorityP3,
  P4: styles.priorityP4,
};

const confidenceClass: Record<ConfidenceBand, string> = {
  HIGH:     styles.confidenceHigh,
  MEDIUM:   styles.confidenceMedium,
  LOW:      styles.confidenceLow,
  VERY_LOW: styles.confidenceVeryLow,
};

export function SeverityBadge({ severity }: SeverityBadgeProps){
  return <span className={`${styles.badge} ${severityClass[severity]}`}>{severity}</span>;
}

export function PriorityBadge({ band }: PriorityBadgeProps){
  return <span className={`${styles.badge} ${priorityClass[band]}`}>{band}</span>;
}

export function ConfidenceBadge({ band }: ConfidenceBadgeProps){
  return <span className={`${styles.badge} ${confidenceClass[band]}`}>{band.replace('_', ' ')}</span>;
}

export function NeutralBadge({ label }: { label: string }){
  return <span className={`${styles.badge} ${styles.neutral}`}>{label}</span>;
}
