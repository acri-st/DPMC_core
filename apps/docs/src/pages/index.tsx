import type { ReactNode } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Hero from '@site/src/components/home/Hero';
import Capabilities from '@site/src/components/home/Capabilities';
import Concepts from '@site/src/components/home/Concepts';
import Warhol from '@site/src/components/home/Warhol';
import Quickstart from '@site/src/components/home/Quickstart';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="DPMC orchestrates Earth observation data pipelines — container-native, multi-runtime, with built-in CO₂e accounting."
    >
      <Hero />
      <main>
        <Capabilities />
        <Concepts />
        <Warhol />
        <Quickstart />
      </main>
    </Layout>
  );
}
