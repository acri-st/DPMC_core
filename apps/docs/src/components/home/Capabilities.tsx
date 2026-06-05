import type { ReactNode } from 'react';
import styles from './home.module.css';

type Capability = {
  icon: string;
  title: string;
  description: string;
};

const CAPABILITIES: Capability[] = [
  {
    icon: '⬡',
    title: 'DAG orchestration',
    description:
      'Chains as DAGs with dynamic fan-out and rich dependency rules (success, failure, convergence, data availability).',
  },
  {
    icon: '⚖',
    title: 'Smart scheduling',
    description:
      'Best-Fit-Decreasing bin-packing, weighted fairness across projects, aging against starvation, GPU-aware placement.',
  },
  {
    icon: '▣',
    title: 'Multi-runtime',
    description:
      'Docker on cloud / on-prem and Apptainer on HPC, picked per project and per site.',
  },
  {
    icon: '🌱',
    title: 'CO₂e accounting',
    description:
      'Per-job, per-task and per-project carbon estimates from CPU, storage and transfer — PUE-aware.',
  },
];

export default function Capabilities(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>
        <span className={styles.eyebrow}>Core capabilities</span>
        <h2>What DPMC does</h2>
        <p>
          A generic Earth-observation orchestration engine built for massive
          campaigns on cloud, on-prem, or HPC.
        </p>
      </div>
      <div className={styles.capabilitiesGrid}>
        {CAPABILITIES.map((c) => (
          <div key={c.title} className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden>
              {c.icon}
            </div>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
