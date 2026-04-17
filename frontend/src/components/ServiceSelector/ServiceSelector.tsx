import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ServiceSelector.module.css';

export const KNOWN_SERVICES = [
  'api-gateway',
  'auth-service',
  'audit-service',
  'clearing-service',
  'compliance-engine',
  'config-service',
  'fix-gateway',
  'kafka-broker',
  'margin-service',
  'market-data-feed',
  'matching-engine',
  'notification-service',
  'order-gateway',
  'position-service',
  'postgres-primary',
  'postgres-replica',
  'price-engine',
  'redis-cache',
  'reporting-service',
  'risk-engine',
  'session-manager',
  'settlement-service',
  'trade-executor',
  'user-service',
  'zookeeper',
];

interface ServiceSelectorProps {
  value: string[];
  onChange: (services: string[]) => void;
  placeholder?: string;
}

export function ServiceSelector({ value, onChange, placeholder = 'Search or type a service name…' }: ServiceSelectorProps) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = KNOWN_SERVICES.filter(
    s => s.includes(query.toLowerCase()) && !value.includes(s)
  );

  const canAddCustom = query.trim().length > 0
    && !KNOWN_SERVICES.includes(query.trim())
    && !value.includes(query.trim());

  const addService = useCallback((svc: string) => {
    const trimmed = svc.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery('');
    setActiveIdx(0);
    inputRef.current?.focus();
  }, [value, onChange]);

  const removeService = useCallback((svc: string) => {
    onChange(value.filter(s => s !== svc));
  }, [value, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalItems = filtered.length + (canAddCustom ? 1 : 0);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActiveIdx(i => Math.min(i + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (!open || totalItems === 0) {
          if (query.trim()) addService(query.trim());
          return;
        }
        if (activeIdx < filtered.length) {
          addService(filtered[activeIdx]);
        } else if (canAddCustom) {
          addService(query.trim());
        }
        break;
      case 'Backspace':
        if (query === '' && value.length > 0) {
          removeService(value[value.length - 1]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        setOpen(true);
        setActiveIdx(0);
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputBox} onClick={() => inputRef.current?.focus()}>
        {value.map(svc => (
          <span className={styles.chip} key={svc}>
            {svc}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={e => { e.stopPropagation(); removeService(svc); }}
              aria-label={`Remove ${svc}`}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && (filtered.length > 0 || canAddCustom) && (
        <div className={styles.dropdown}>
          {filtered.map((svc, i) => (
            <div
              key={svc}
              className={`${styles.dropdownItem} ${i === activeIdx ? styles.dropdownItemActive : ''}`}
              onMouseDown={e => { e.preventDefault(); addService(svc); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {svc}
            </div>
          ))}
          {canAddCustom && (
            <div
              className={`${styles.addCustom} ${activeIdx === filtered.length ? styles.dropdownItemActive : ''}`}
              onMouseDown={e => { e.preventDefault(); addService(query.trim()); }}
              onMouseEnter={() => setActiveIdx(filtered.length)}
            >
              Add <span className={styles.addCustomMono}>"{query.trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
