import type { ReactNode } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import clsx from 'clsx';
import styles from './home.module.css';

const DAG = [
  { label: 'RESIZE' },
  { label: 'CALC' },
  { label: 'TINT × N (fan-out)', fan: true },
  { label: 'COMBINE' },
  { label: 'PUBLISH' },
];

export default function Warhol(): ReactNode {
  return (
    <section className={clsx(styles.section, styles.warhol)}>
      <div className={styles.sectionTitle}>
        <span className={styles.eyebrow}>Walkthrough example</span>
        <h2>Warhol — a demo chain</h2>
        <p>
          No EO context needed: turn an image into a colored grid. The DAG
          showcases fan-out and conditional dependencies.
        </p>
      </div>

      <div className={styles.dag}>
        {DAG.map((n, i) => (
          <span key={n.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className={clsx(styles.dagNode, n.fan && styles.dagNodeFan)}
            >
              {n.label}
            </span>
            {i < DAG.length - 1 && (
              <span className={styles.archArrow} aria-hidden>→</span>
            )}
          </span>
        ))}
      </div>

      <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
        <div className={styles.screenshot}>
          <div className={styles.screenshotHeader}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <img
            className={styles.screenshotImg}
            src={useBaseUrl('/img/screenshots/warhol-running.png')}
            alt="Dashboard view of a Warhol chain running with fan-out TINT jobs"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
