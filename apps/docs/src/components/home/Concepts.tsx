import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import clsx from 'clsx';
import styles from './home.module.css';

type Concept = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  screenshot: string;
  alt: string;
};

const CONCEPTS: Concept[] = [
  {
    eyebrow: 'Production Chain',
    title: 'Describe a chain once, run it forever',
    description:
      'A ProductionChain wires ProcessingScripts into a configurable DAG. Trigger it manually, on a cron, or on incoming products — the engine handles fan-out and dependency resolution.',
    href: '/docs/concepts/production-chain',
    screenshot: '/img/screenshots/production-chains-list.png',
    alt: 'Dashboard view listing production chains',
  },
  {
    eyebrow: 'Task · Batch · Job',
    title: 'Three layers of execution',
    description:
      'Task is a node of the DAG, Batch groups jobs spawned from a fan-out, Job is a single execution on a Host. Every layer is tracked in Postgres with full lineage.',
    href: '/docs/concepts/task-batch-job',
    screenshot: '/img/screenshots/jobs-live.png',
    alt: 'Dashboard view with live jobs',
  },
];

export default function Concepts(): ReactNode {
  return (
    <section className={clsx(styles.section, styles.concepts)}>
      <div className={styles.sectionTitle}>
        <span className={styles.eyebrow}>Mental model</span>
        <h2>The core concepts</h2>
        <p>Understand DPMC through four objects.</p>
      </div>

      {CONCEPTS.map((c, i) => (
        <div
          key={c.title}
          className={clsx(styles.conceptRow, i % 2 === 1 && styles.reverse)}
        >
          <div className={styles.conceptText}>
            <span className={styles.eyebrow}>{c.eyebrow}</span>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <Link to={c.href} className={styles.conceptLink}>
              Learn more →
            </Link>
          </div>
          <div className={styles.screenshot}>
            <div className={styles.screenshotHeader}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <img
              className={styles.screenshotImg}
              src={useBaseUrl(c.screenshot)}
              alt={c.alt}
              loading="lazy"
            />
          </div>
        </div>
      ))}
    </section>
  );
}
