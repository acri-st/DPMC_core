import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/overview',
        'concepts/project',
        'concepts/production-chain',
        'concepts/processing-script',
        'concepts/task-batch-job',
        'concepts/products',
        'concepts/host-datacenter',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/data-model',
        'architecture/scheduler',
        'architecture/triggering',
        'architecture/security',
        'architecture/carbon-footprint',
        'architecture/multi-site',
      ],
    },
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/install',
        'getting-started/cli',
        'getting-started/web-console',
      ],
    },
    'roadmap',
  ],
};

export default sidebars;
