import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './home.module.css';

export default function Hero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className="container">
        <span className={styles.heroEyebrow}>Open-architecture EO orchestrator</span>
        <h1 className={styles.heroTitle}>
          Orchestrate Earth observation
          <br />
          <span className={styles.heroAccent}>data pipelines at any scale.</span>
        </h1>
        <p className={styles.heroSubtitle}>
          {siteConfig.tagline} A container-native engine for complex EO
          processing chains — dynamic fan-out, smart scheduling, multi-runtime,
          CO₂ accounting.
        </p>
        <div className={styles.heroCta}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Read the docs →
          </Link>
        </div>
      </div>
    </header>
  );
}
