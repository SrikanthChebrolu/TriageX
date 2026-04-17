import { useState, lazy, Suspense, useEffect } from 'react';
import styles from './App.module.css';

const LogAnalysisPage = lazy(() =>
  import('./pages/LogAnalysisPage/LogAnalysisPage').then(m => ({ default: m.LogAnalysisPage }))
);
const TriagePage = lazy(() =>
  import('./pages/TriagePage/TriagePage').then(m => ({ default: m.TriagePage }))
);
const RootCausePage = lazy(() =>
  import('./pages/RootCausePage/RootCausePage').then(m => ({ default: m.RootCausePage }))
);
type Page = 'logs' | 'triage' | 'rootcause';

const NAV: Array<{ id: Page; label: string; icon: string; sub: string }> = [
  { id: 'logs',      label: 'Log Analysis',  icon: '📋', sub: 'Cluster & analyse log batches' },
  { id: 'triage',    label: 'Triage',        icon: '🎯', sub: 'Priority scoring & investigation steps' },
  { id: 'rootcause', label: 'Root Cause',    icon: '🔍', sub: 'Multi-signal root cause analysis' },
];

const PAGE_TITLES: Record<Page, string> = {
  logs:      'Log Ingestion & Analysis',
  triage:    'Incident Triage & Prioritization',
  rootcause: 'Root Cause Suggestion',
};

export default function App(){
  const [page, setPage]           = useState<Page>('triage');
  const [sidebarOpen, setSidebar] = useState(false);

  // Close sidebar on escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebar(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close sidebar when page changes (mobile UX)
  function navigate(id: Page) {
    setPage(id);
    setSidebar(false);
  }

  return (
    <div className={styles.layout}>
      {/* Overlay — tap to close sidebar on mobile */}
      {sidebarOpen && (
        <div
          className={`${styles.overlay} ${styles.overlayVisible}`}
          onClick={() => setSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Close button — mobile only */}
        <div className={styles.sidebarClose}>
          <button className={styles.closeBtn} onClick={() => setSidebar(false)} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className={styles.brand}>
          <div className={styles.brandName}>TriageX</div>
          <div className={styles.brandSub}>AI Incident Analysis</div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>Capabilities</div>
          {NAV.map(n => (
            <div
              key={n.id}
              className={`${styles.navLink} ${page === n.id ? styles.navLinkActive : ''}`}
              onClick={() => navigate(n.id)}
            >
              <span className={styles.navIcon}>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.topbar}>
          {/* Hamburger — only visible on mobile via CSS */}
          <button
            className={styles.menuBtn}
            onClick={() => setSidebar(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <span className={styles.topbarTitle}>TriageX</span>
          <span className={styles.topbarSep}>›</span>
          <span className={styles.topbarSub}>{PAGE_TITLES[page]}</span>
        </div>

        <div className={styles.content}>
          <Suspense fallback={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}>
            {page === 'logs'      && <LogAnalysisPage />}
            {page === 'triage'    && <TriagePage />}
            {page === 'rootcause' && <RootCausePage />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
