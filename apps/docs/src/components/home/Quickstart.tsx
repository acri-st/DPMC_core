import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import styles from './home.module.css';

type Step = {
  title: string;
  body: string;
  code: string;
};

const STEPS: Step[] = [
  {
    title: 'Clone the repo',
    body: 'Grab the source and switch into the project directory.',
    code: 'git clone git@<gitlab-host>:dpmc/dpmc.git\ncd dpmc',
  },
  {
    title: 'Boot the stack',
    body: 'Docker Compose starts Postgres, the API, a worker and the web console.',
    code: 'docker compose up -d\npnpm db:seed',
  },
  {
    title: 'Open the console',
    body: 'Log in with the seeded credentials and explore the seeded chains.',
    code: 'open http://localhost:5173',
  },
];

export default function Quickstart(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>
        <span className={styles.eyebrow}>Getting started</span>
        <h2>Run DPMC locally in 3 steps</h2>
        <p>
          With Docker Compose you get the API, the console, Postgres and a
          worker in under 5 minutes.
        </p>
      </div>

      <div className={styles.quickstartGrid}>
        {STEPS.map((s, i) => (
          <div key={s.title} className={styles.qsStep}>
            <div className={styles.qsNum}>{i + 1}</div>
            <h4>{s.title}</h4>
            <p>{s.body}</p>
            <pre>{s.code}</pre>
          </div>
        ))}
      </div>

      <div className={styles.qsCta}>
        <Link className="button button--primary button--lg" to="/docs/getting-started/install">
          Full install guide →
        </Link>
      </div>
    </section>
  );
}
